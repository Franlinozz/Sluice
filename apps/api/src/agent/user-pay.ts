/**
 * User-funded asks — the human pays the citation toll from THEIR OWN wallet, so they become a real
 * distinct payer (not the shared operator agent). Uses EIP-3009 `transferWithAuthorization` on the
 * Arc USDC token: the user signs one gasless EIP-712 authorization in the browser; the operator
 * relays it on-chain (paying gas); USDC moves user → creator directly; the receipt records
 * payer = the user's wallet. No Gateway deposit needed (draws straight from wallet balance).
 *
 * Two phases so the browser never sees an amount it didn't sign for:
 *  prepare() picks the single most-relevant source, stores the exact authorization server-side,
 *  and returns the typed data to sign. submit() relays the stored authorization + the signature.
 */
import { randomUUID, randomBytes } from "node:crypto";
import type { Address, Hex } from "viem";
import {
  arcConfig,
  chainId,
  explorerTxUrl,
  getClient,
  getUsdcBalance,
  getWalletClient,
} from "@sluice/chain";
import { formatUSD, toBaseUnitString } from "@sluice/money";
import { db } from "../db/client.ts";
import { citations, research, receipts, type Resource, type UnitType } from "../db/schema.ts";
import { listResources } from "../registry.ts";
import { reason } from "./reasoning.ts";
import { defaultRules, keywords } from "./policy.ts";
import { chatJSON, hasOpenAI } from "./openai.ts";

const EVAL_LIMIT = Number(process.env.USERPAY_EVAL_LIMIT ?? "6");
const RELEVANCE_THRESHOLD = Number(process.env.RESEARCH_RELEVANCE_THRESHOLD ?? "45");
const AUTH_WINDOW_SECONDS = 3600; // signed authorization is valid for 1 hour
const PENDING_TTL_MS = 10 * 60 * 1000;

/** EIP-3009 transferWithAuthorization (v,r,s overload) — standard on Circle USDC (FiatTokenV2). */
const TRANSFER_WITH_AUTH_ABI = [
  {
    type: "function",
    name: "transferWithAuthorization",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

interface Pending {
  userAddress: string;
  profileId: string | null;
  question: string;
  resourceId: string;
  resourceName: string;
  author: string | null;
  sourceUrl: string | null;
  description: string | null;
  unitType: UnitType;
  payTo: string;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  expires: number;
}

const pending = new Map<string, Pending>();

function sweep(): void {
  const now = Date.now();
  for (const [k, v] of pending) if (v.expires < now) pending.delete(k);
}

/** Lexical-rank eligible sources (on-topic + recent), excluding ones the user would pay to themselves. */
function rankEligible(question: string, exclude: string): Resource[] {
  const eligible = listResources().filter(
    (r) =>
      (r.unitType === "per_citation" || r.unitType === "per_read") &&
      r.contentUrl &&
      BigInt(r.unitPrice) > 0n &&
      r.payTo.toLowerCase() !== exclude, // never pay yourself
  );
  const qk = new Set(keywords(question));
  const overlap = (r: Resource): number => {
    if (qk.size === 0) return 0;
    let n = 0;
    for (const w of keywords(`${r.name} ${r.description ?? ""} ${r.author ?? ""}`)) if (qk.has(w)) n++;
    return n;
  };
  return [...eligible]
    .sort((a, b) => {
      const d = overlap(b) - overlap(a);
      if (d !== 0) return d;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, EVAL_LIMIT);
}

/** Pick the single most-relevant source to pay (or null if nothing clears the bar). */
async function selectTop(question: string, exclude: string): Promise<Resource | null> {
  const candidates = rankEligible(question, exclude);
  let best: Resource | null = null;
  let bestRel = -1;
  for (const r of candidates) {
    const res = await reason(question, defaultRules(), {
      id: r.id,
      name: r.name,
      description: r.description,
      unitType: r.unitType,
      formattedPrice: `$${(Number(r.unitPrice) / 1e6).toFixed(6)}`,
    });
    if (res.relevance > bestRel) {
      bestRel = res.relevance;
      best = r;
    }
    if (bestRel >= 90) break; // clearly relevant — stop burning LLM calls
  }
  return best && bestRel >= RELEVANCE_THRESHOLD ? best : null;
}

async function synthesize(question: string, name: string, summary: string | null): Promise<string> {
  if (hasOpenAI()) {
    try {
      const out = await chatJSON<{ answer: string }>(
        `You are a research assistant. Answer the QUESTION using ONLY the single SOURCE provided. Cite it inline as [1]. Be concise (2-3 sentences). Return JSON {"answer":"..."}.`,
        JSON.stringify({ question, source: { title: name, summary } }),
        220,
      );
      if (out.answer && typeof out.answer === "string") return out.answer.slice(0, 800);
    } catch {
      /* fall through */
    }
  }
  return `Grounded in one paid source you funded: ${summary ? summary : name} [1].`.slice(0, 800);
}

export interface PrepareResult {
  requestId: string | null;
  reason?: string;
  item?: {
    resourceId: string;
    name: string;
    author: string | null;
    sourceUrl: string | null;
    payTo: string;
    formattedAmount: string;
    typedData: {
      domain: { name: string; version: string; chainId: number; verifyingContract: string };
      types: Record<string, { name: string; type: string }[]>;
      primaryType: string;
      message: Record<string, string>;
    };
  };
}

export async function prepareUserAsk(
  question: string,
  userAddress: string,
  profileId?: string,
): Promise<PrepareResult> {
  sweep();
  const addr = userAddress.toLowerCase();
  const r = await selectTop(question, addr);
  if (!r) {
    return { requestId: null, reason: "No registered source is relevant enough to ground a paid answer." };
  }

  const value = BigInt(r.unitPrice);
  const validAfter = 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + AUTH_WINDOW_SECONDS);
  const nonce = `0x${randomBytes(32).toString("hex")}` as Hex;
  const requestId = randomUUID();

  pending.set(requestId, {
    userAddress: addr,
    profileId: profileId ?? null,
    question,
    resourceId: r.id,
    resourceName: r.name,
    author: r.author,
    sourceUrl: r.contentUrl,
    description: r.description,
    unitType: r.unitType,
    payTo: r.payTo,
    value,
    validAfter,
    validBefore,
    nonce,
    expires: Date.now() + PENDING_TTL_MS,
  });

  return {
    requestId,
    item: {
      resourceId: r.id,
      name: r.name,
      author: r.author,
      sourceUrl: r.contentUrl,
      payTo: r.payTo,
      formattedAmount: formatUSD(value),
      typedData: {
        domain: { name: "USDC", version: "2", chainId, verifyingContract: arcConfig.usdcToken },
        types: {
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        },
        primaryType: "TransferWithAuthorization",
        // Strings for JSON transport; the browser converts uint fields to BigInt before signing.
        message: {
          from: userAddress,
          to: r.payTo,
          value: value.toString(),
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce,
        },
      },
    },
  };
}

/** Split a 65-byte compact signature into (v, r, s) — version-independent of viem helpers. */
function splitSignature(sig: string): { v: number; r: Hex; s: Hex } {
  const h = sig.startsWith("0x") ? sig.slice(2) : sig;
  if (h.length !== 130) throw new Error("malformed signature");
  const r = (`0x${h.slice(0, 64)}`) as Hex;
  const s = (`0x${h.slice(64, 128)}`) as Hex;
  let v = parseInt(h.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
  answer?: string;
  txHash?: string;
  explorerUrl?: string;
  citation?: {
    name: string;
    author: string | null;
    sourceUrl: string | null;
    formattedAmount: string;
    payTo: string;
  };
}

export async function submitUserAsk(requestId: string, signature: string): Promise<SubmitResult> {
  sweep();
  const p = pending.get(requestId);
  if (!p) return { ok: false, error: "This request expired or was already used — ask again." };
  pending.delete(requestId); // one-shot: prevents replay / double submit

  const pk = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex | undefined;
  if (!pk) return { ok: false, error: "relayer wallet not configured" };

  let v: number;
  let r: Hex;
  let s: Hex;
  try {
    ({ v, r, s } = splitSignature(signature));
  } catch {
    return { ok: false, error: "invalid signature" };
  }

  // Pre-check funds so we don't relay (and pay gas for) a transfer that will revert.
  try {
    const bal = await getUsdcBalance(p.userAddress as Address);
    if (bal < p.value) {
      return {
        ok: false,
        error: `Insufficient USDC: your wallet holds ${formatUSD(bal)} but this source costs ${formatUSD(p.value)}. Claim from the faucet on /join.`,
      };
    }
  } catch {
    /* balance read hiccup — fall through and let the on-chain result be authoritative */
  }

  const wallet = getWalletClient(pk);
  const pub = getClient();

  let txHash: Hex;
  try {
    txHash = await wallet.writeContract({
      address: arcConfig.usdcToken as Address,
      abi: TRANSFER_WITH_AUTH_ABI,
      functionName: "transferWithAuthorization",
      args: [
        p.userAddress as Address,
        p.payTo as Address,
        p.value,
        p.validAfter,
        p.validBefore,
        p.nonce,
        v,
        r,
        s,
      ],
      account: wallet.account!,
      chain: wallet.chain,
    });
  } catch (e) {
    return { ok: false, error: `on-chain payment failed: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}` };
  }

  const rcpt = await pub.waitForTransactionReceipt({ hash: txHash });
  if (rcpt.status !== "success") {
    return { ok: false, error: "payment transaction reverted on-chain" };
  }

  // Record the ask + citation + a settled receipt whose PAYER is the user (real distinct payer).
  const answer = await synthesize(p.question, p.resourceName, p.description);
  const researchId = randomUUID();
  const now = new Date();
  db.insert(research)
    .values({
      id: researchId,
      question: p.question,
      mode: hasOpenAI() ? "live" : "mock",
      profileId: p.profileId,
      answer,
      citationCount: 1,
      totalPaid: toBaseUnitString(p.value),
    })
    .run();
  db.insert(citations)
    .values({
      id: randomUUID(),
      researchId,
      resourceId: p.resourceId,
      resourceName: p.resourceName,
      sourceUrl: p.sourceUrl,
      author: p.author,
      amount: toBaseUnitString(p.value),
      settlementType: "onchain",
      txHash,
      splitterAddress: null,
      splits: null,
      marker: 1,
    })
    .run();
  db.insert(receipts)
    .values({
      id: randomUUID(),
      resourceId: p.resourceId,
      payer: p.userAddress,
      unitType: p.unitType,
      units: 1,
      rate: p.value.toString(),
      grossAmount: toBaseUnitString(p.value),
      batchTxHash: txHash,
      settlementRef: JSON.stringify([txHash]),
      backend: "direct",
      status: "settled",
      raw: JSON.stringify({ userFunded: true, txHash, from: p.userAddress }),
      settledAt: now,
    })
    .run();

  return {
    ok: true,
    answer,
    txHash,
    explorerUrl: explorerTxUrl(txHash),
    citation: {
      name: p.resourceName,
      author: p.author,
      sourceUrl: p.sourceUrl,
      formattedAmount: formatUSD(p.value),
      payTo: p.payTo,
    },
  };
}

// A tiny helper so tests can assert the pending map behaviour without exporting internals.
export const _debug = { pendingSize: () => pending.size };
