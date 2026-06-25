/**
 * Quadratic funding driver (Phase 10). Tips are REAL on-chain USDC transfers from backers to
 * creators; the pool matches breadth quadratically and sweeps the matches to creators in a single
 * on-chain transaction (FundingPool.distribute). Sybil weight is a documented heuristic — honest
 * about its limits.
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { erc20Abi, type Address, type Hex } from "viem";
import { formatUSDC, parseUSDC, fromBaseUnitString } from "@sluice/money";
import { arcConfig, getClient, getWalletClient } from "@sluice/chain";
import { db } from "../db/client.ts";
import { fundingTips, fundingRounds, type FundingTip } from "../db/schema.ts";
import { deployed } from "../contracts/escrow.ts";
import { fundingPoolAbi } from "../contracts/funding-pool.ts";
import { identityRegistryAbi } from "../contracts/identity-registry.ts";
import { computeMatches, type CreatorContributions, type RoundMatches } from "./quadratic.ts";

export function poolReady(): boolean {
  try {
    return Boolean(deployed().fundingPool?.address);
  } catch {
    return false;
  }
}

function poolAddress(): Address {
  const a = deployed().fundingPool?.address;
  if (!a) throw new Error("FundingPool not deployed");
  return a;
}
function operatorKey(): Hex {
  const k = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex | undefined;
  if (!k) throw new Error("no operator key");
  return k;
}
export function operatorAddress(): Address {
  return getWalletClient(operatorKey()).account!.address;
}

/** On-chain USDC balance of the matching pool. */
export async function poolBalance(): Promise<bigint> {
  return (await getClient().readContract({
    address: poolAddress(),
    abi: fundingPoolAbi,
    functionName: "balance",
  })) as bigint;
}

/**
 * Sybil weight heuristic (basis points). Honest about limits: true sybil resistance needs
 * proof-of-personhood. Here: a registered ERC-8004 identity → full weight; otherwise weighted by
 * on-chain activity (account nonce). Unknown/fresh wallets are discounted so a flood of empty sybil
 * wallets cannot cheaply inflate the quadratic match.
 */
export async function backerWeightBps(backer: Address): Promise<number> {
  const client = getClient();
  try {
    const id = (await client.readContract({
      address: deployed().identityRegistry.address,
      abi: identityRegistryAbi,
      functionName: "agentIdOf",
      args: [backer],
    })) as bigint;
    if (id > 0n) return 10_000; // verified identity → full weight
  } catch {
    /* identity lookup best-effort */
  }
  const nonce = await client.getTransactionCount({ address: backer }).catch(() => 0);
  if (nonce >= 20) return 8_000;
  if (nonce >= 5) return 6_000;
  return 4_000; // fresh/low-history wallet → discounted
}

/** The matching budget an operator commits per round (the pool is funded to cover the matches). */
const DEFAULT_BUDGET = (() => {
  try {
    return parseUSDC(process.env.FUNDING_POOL_BUDGET ?? "0.10");
  } catch {
    return parseUSDC("0.10");
  }
})();

export function currentRound(): number {
  const open = db.select().from(fundingRounds).where(eq(fundingRounds.status, "open")).get();
  if (open) return open.round;
  const last = db.select().from(fundingRounds).orderBy(desc(fundingRounds.round)).get();
  const round = (last?.round ?? 0) + 1;
  db.insert(fundingRounds).values({ round, status: "open", budget: DEFAULT_BUDGET.toString() }).run();
  return round;
}

/** The committed matching budget for a round (falls back to the default). */
function roundBudget(round: number): bigint {
  const row = db.select().from(fundingRounds).where(eq(fundingRounds.round, round)).get();
  return row?.budget ? fromBaseUnitString(row.budget) : DEFAULT_BUDGET;
}

export interface TipInput {
  creator: Address;
  amountUsd: string;
  label?: string;
  resourceId?: string;
}

/** Record a REAL tip: transfer USDC from the backer to the creator on-chain, then persist it. */
export async function addTip(input: TipInput, backerKey: Hex): Promise<FundingTip> {
  const amount = parseUSDC(input.amountUsd);
  if (amount <= 0n) throw new Error("tip must be > 0");
  const wallet = getWalletClient(backerKey);
  const backer = wallet.account!.address;
  const round = currentRound();

  const tx = await wallet.writeContract({
    address: arcConfig.usdcToken,
    abi: erc20Abi,
    functionName: "transfer",
    args: [input.creator, amount],
    account: wallet.account!,
    chain: wallet.chain,
  });
  await getClient().waitForTransactionReceipt({ hash: tx });

  const weightBps = await backerWeightBps(backer);
  const row = {
    id: randomUUID(),
    round,
    backer,
    creator: input.creator,
    resourceId: input.resourceId ?? null,
    label: input.label ?? null,
    amount: amount.toString(),
    weightBps,
    tx,
  };
  db.insert(fundingTips).values(row).run();
  return db.select().from(fundingTips).where(eq(fundingTips.id, row.id)).get()!;
}

/** Tip from the operator-controlled demo backer (used by the UI control). */
export async function addTipFromOperator(input: TipInput): Promise<FundingTip> {
  return addTip(input, operatorKey());
}

function tipsToContributions(tips: FundingTip[]): CreatorContributions[] {
  const byCreator = new Map<string, CreatorContributions>();
  for (const t of tips) {
    const key = t.creator;
    if (!byCreator.has(key))
      byCreator.set(key, { creator: t.creator, resourceId: t.resourceId, label: t.label ?? undefined, contributions: [] });
    byCreator.get(key)!.contributions.push({
      backer: t.backer,
      amount: BigInt(t.amount),
      weight: t.weightBps / 10_000,
    });
  }
  return Array.from(byCreator.values());
}

export async function previewRound(round?: number): Promise<RoundMatches & { round: number }> {
  const r = round ?? currentRound();
  const tips = db.select().from(fundingTips).where(eq(fundingTips.round, r)).all();
  // The matching budget is the operator's committed amount for the round; the pool is funded to
  // cover the resulting matches at settlement. Use the larger of the commitment and any pre-funding.
  const onchain = poolReady() ? await poolBalance() : 0n;
  const budget = onchain > roundBudget(r) ? onchain : roundBudget(r);
  return { round: r, ...computeMatches(tipsToContributions(tips), budget) };
}

export interface SettleResult {
  round: number;
  fundTx?: string;
  distributeTx: string;
  matchTotal: string;
  payouts: { creator: string; amount: string }[];
}

/** Settle a round: ensure the pool covers the matches, then sweep them to creators in one tx. */
export async function settleRound(round?: number): Promise<SettleResult> {
  const r = round ?? currentRound();
  const existing = db.select().from(fundingRounds).where(eq(fundingRounds.round, r)).get();
  if (existing?.status === "settled") throw new Error(`round ${r} already settled`);

  const preview = await previewRound(r);
  const winners = preview.creators.filter((c) => c.match > 0n);
  if (winners.length === 0) throw new Error("no positive matches to settle");

  const operator = getWalletClient(operatorKey());
  const client = getClient();
  const pool = poolAddress();
  const matchTotal = winners.reduce((a, c) => a + c.match, 0n);

  // Fund the pool from the operator if it can't cover the matches.
  let fundTx: Hex | undefined;
  const bal = await poolBalance();
  if (bal < matchTotal) {
    const need = matchTotal - bal;
    const approveTx = await operator.writeContract({
      address: arcConfig.usdcToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [pool, need],
      account: operator.account!,
      chain: operator.chain,
    });
    await client.waitForTransactionReceipt({ hash: approveTx });
    fundTx = await operator.writeContract({
      address: pool,
      abi: fundingPoolAbi,
      functionName: "fund",
      args: [need],
      account: operator.account!,
      chain: operator.chain,
    });
    await client.waitForTransactionReceipt({ hash: fundTx });
  }

  const creators = winners.map((c) => c.creator as Address);
  const amounts = winners.map((c) => c.match);
  const distributeTx = await operator.writeContract({
    address: pool,
    abi: fundingPoolAbi,
    functionName: "distribute",
    args: [BigInt(r), creators, amounts],
    account: operator.account!,
    chain: operator.chain,
  });
  await client.waitForTransactionReceipt({ hash: distributeTx });

  db.insert(fundingRounds)
    .values({ round: r, status: "settled", budget: preview.budget.toString(), matchTotal: matchTotal.toString(), fundTx: fundTx ?? null, distributeTx, settledAt: new Date() })
    .onConflictDoUpdate({
      target: fundingRounds.round,
      set: { status: "settled", budget: preview.budget.toString(), matchTotal: matchTotal.toString(), fundTx: fundTx ?? null, distributeTx, settledAt: new Date() },
    })
    .run();

  return {
    round: r,
    fundTx,
    distributeTx,
    matchTotal: matchTotal.toString(),
    payouts: winners.map((c) => ({ creator: c.creator, amount: c.match.toString() })),
  };
}

// ── serialization for the API/UI ─────────────────────────────────
const ex = () => deployed().explorer.replace(/\/$/, "");

export async function fundingState() {
  const round = currentRound();
  const preview = await previewRound(round);
  const tips = db.select().from(fundingTips).where(eq(fundingTips.round, round)).all();
  const roundRow = db.select().from(fundingRounds).where(eq(fundingRounds.round, round)).get();
  const rounds = db.select().from(fundingRounds).orderBy(desc(fundingRounds.round)).all();
  return {
    pool: {
      address: poolReady() ? poolAddress() : null,
      url: poolReady() ? `${ex()}/address/${poolAddress()}` : null,
      balance: preview.budget.toString(),
      formattedBalance: formatUSDC(preview.budget),
    },
    round,
    status: roundRow?.status ?? "open",
    alpha: preview.alpha,
    matchTotal: preview.matchTotal.toString(),
    formattedMatchTotal: formatUSDC(preview.matchTotal),
    creators: preview.creators.map((c) => ({
      creator: c.creator,
      label: c.label ?? null,
      backers: c.backers,
      raised: c.raised.toString(),
      formattedRaised: formatUSDC(c.raised),
      match: c.match.toString(),
      formattedMatch: formatUSDC(c.match),
      total: c.total.toString(),
      formattedTotal: formatUSDC(c.total),
    })),
    tips: tips.map((t) => ({
      backer: t.backer,
      creator: t.creator,
      label: t.label,
      amount: t.amount,
      formattedAmount: formatUSDC(fromBaseUnitString(t.amount)),
      weightBps: t.weightBps,
      tx: t.tx,
      txUrl: t.tx ? `${ex()}/tx/${t.tx}` : null,
    })),
    history: rounds
      .filter((r) => r.status === "settled")
      .map((r) => ({
        round: r.round,
        matchTotal: r.matchTotal,
        formattedMatchTotal: r.matchTotal ? formatUSDC(fromBaseUnitString(r.matchTotal)) : "0.00",
        distributeTx: r.distributeTx,
        distributeTxUrl: r.distributeTx ? `${ex()}/tx/${r.distributeTx}` : null,
        settledAt: r.settledAt,
      })),
  };
}
