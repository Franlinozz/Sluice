/**
 * The broker (Phase 5): pairs a buyer's need with a provider and requires the provider to put real
 * capital at risk before the work begins. The provider self-bonds USDC into the on-chain BondEscrow;
 * on successful delivery the arbiter RELEASES it, on underdelivery the arbiter SLASHES it to the
 * buyer. Each resolution also records ERC-8004 feedback on the provider's identity. Reputation is a
 * fact you can read off-chain (capital staked, capital slashed), not a rating you have to trust.
 *
 * Real Arc transactions throughout (CLAUDE.md: no fakes). See contracts/escrow.ts for the drivers.
 */
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { formatUSDC, parseUSDC, fromBaseUnitString } from "@sluice/money";
import { db } from "../db/client.ts";
import { matches, type Match, type MatchStatus } from "../db/schema.ts";
import { getResource } from "../registry.ts";
import {
  arbiterAddress,
  providerAddress,
  computeMatchId,
  postBond,
  resolveBond,
  ensureProviderIdentity,
  giveFeedback,
  getReputation,
  getBondOnChain,
  getFeedbackStats,
  deployed,
} from "../contracts/escrow.ts";

const DEFAULT_BOND_USD = process.env.BROKER_DEFAULT_BOND ?? "0.02";
const API_PUBLIC = process.env.API_PUBLIC_URL ?? "https://sluiceflow.vercel.app/gw";

export interface CreateMatchInput {
  resourceId?: string;
  need: string;
  bondUsd?: string;
}

/** Broker a new match: provider self-bonds USDC guaranteeing delivery of `need`. */
export async function createMatch(input: CreateMatchInput): Promise<Match> {
  const need = input.need?.trim();
  if (!need) throw new Error("need is required");

  let resourceId: string | undefined;
  let domain = `${API_PUBLIC}/.well-known/agent.json`;
  let metaUri = `${API_PUBLIC}/agents/provider`;
  if (input.resourceId) {
    const r = getResource(input.resourceId);
    if (!r) throw new Error("resource not found");
    resourceId = r.id;
    metaUri = `${API_PUBLIC}/resources/${r.id}/llms.txt`;
  }

  const amount = parseUSDC(input.bondUsd ?? DEFAULT_BOND_USD);
  if (amount <= 0n) throw new Error("bond must be > 0");

  const provider = providerAddress();
  const beneficiary = arbiterAddress(); // the hiring buyer / operator (paid if slashed)

  // ERC-8004 identity (idempotent — registers the provider once).
  const agentId = await ensureProviderIdentity(domain, metaUri);

  const matchId = computeMatchId(`${resourceId ?? "match"}:${Date.now()}:${randomUUID()}`);
  const { approveTx, postTx } = await postBond({ matchId, beneficiary, amount });

  const row = {
    id: randomUUID(),
    matchId,
    resourceId: resourceId ?? null,
    need,
    providerWallet: provider,
    beneficiaryWallet: beneficiary,
    agentId: Number(agentId),
    amount: amount.toString(),
    status: "active" as MatchStatus,
    approveTx: approveTx ?? null,
    postTx,
  };
  await db.insert(matches).values(row);
  return (await getMatch(row.id))!;
}

export interface ResolveInput {
  outcome: "release" | "slash";
  reason: string;
}

/** Resolve a match: release the bond (success) or slash it to the buyer (underdelivery). */
export async function resolveMatch(id: string, input: ResolveInput): Promise<Match> {
  const m = await getMatch(id);
  if (!m) throw new Error("match not found");
  if (m.status !== "active") throw new Error(`match already ${m.status}`);
  const reason = input.reason?.trim() || (input.outcome === "slash" ? "underdelivery" : "delivered");

  const resolveTx = await resolveBond({
    matchId: m.matchId as `0x${string}`,
    outcome: input.outcome,
    reason,
  });

  // Record ERC-8004 feedback: 5★ on release, 1★ on slash.
  let feedbackTx: string | null = null;
  if (m.agentId && m.agentId > 0) {
    try {
      feedbackTx = await giveFeedback(BigInt(m.agentId), input.outcome === "slash" ? 1 : 5, reason);
    } catch {
      feedbackTx = null; // feedback is best-effort; the slash/release is the real outcome
    }
  }

  await db
    .update(matches)
    .set({
      status: input.outcome === "slash" ? "slashed" : "released",
      reason,
      resolveTx,
      feedbackTx,
      resolvedAt: new Date(),
    })
    .where(eq(matches.id, id));
  return (await getMatch(id))!;
}

export async function getMatch(id: string): Promise<Match | undefined> {
  return db.select().from(matches).where(eq(matches.id, id)).get();
}

export async function listMatches(): Promise<Match[]> {
  return db.select().from(matches).orderBy(desc(matches.createdAt)).all();
}

export interface ProviderReputationView {
  provider: string;
  matches: number;
  slashes: number;
  reliabilityBps: number;
  // amounts as 6-dp base-unit strings (bigint-safe over JSON)
  bonded: string;
  active: string;
  slashed: string;
  released: string;
  formattedBonded: string;
  formattedActive: string;
  formattedSlashed: string;
  formattedReleased: string;
  reliabilityPct: number;
  feedbackAverage: number; // 0..5
  feedbackCount: number;
}

/** Provider reputation = on-chain bond stats + ERC-8004 feedback. */
export async function providerReputation(agentId?: number): Promise<ProviderReputationView> {
  const provider = providerAddress();
  const rep = await getReputation(provider);
  const fb = agentId && agentId > 0 ? await getFeedbackStats(BigInt(agentId)) : { averageX100: 0, count: 0 };
  return {
    provider: rep.provider,
    matches: rep.matches,
    slashes: rep.slashes,
    reliabilityBps: rep.reliabilityBps,
    bonded: rep.bonded.toString(),
    active: rep.active.toString(),
    slashed: rep.slashed.toString(),
    released: rep.released.toString(),
    formattedBonded: formatUSDC(rep.bonded),
    formattedActive: formatUSDC(rep.active),
    formattedSlashed: formatUSDC(rep.slashed),
    formattedReleased: formatUSDC(rep.released),
    reliabilityPct: Math.round(rep.reliabilityBps / 100),
    feedbackAverage: fb.averageX100 / 100,
    feedbackCount: fb.count,
  };
}

export interface MatchView extends Match {
  formattedAmount: string;
  postTxUrl: string | null;
  resolveTxUrl: string | null;
  feedbackTxUrl: string | null;
  matchIdShort: string;
}

const explorer = () => deployed().explorer.replace(/\/$/, "");

export function serializeMatch(m: Match): MatchView {
  const txUrl = (h: string | null) => (h ? `${explorer()}/tx/${h}` : null);
  return {
    ...m,
    formattedAmount: formatUSDC(fromBaseUnitString(m.amount)),
    postTxUrl: txUrl(m.postTx),
    resolveTxUrl: txUrl(m.resolveTx),
    feedbackTxUrl: txUrl(m.feedbackTx),
    matchIdShort: `${m.matchId.slice(0, 10)}…${m.matchId.slice(-6)}`,
  };
}

export { getBondOnChain };
