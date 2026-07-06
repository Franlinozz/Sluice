/**
 * The citation-toll loop (the hero). A question → the agent reasons over registered citable
 * sources → PAYS the per_citation toll to retrieve each grounded source (payment IS the citation,
 * so it's deterministic + auditable) → synthesises an answer citing only the paid sources.
 * Single-author citations settle gas-free via Gateway; multi-collaborator via the RoyaltySplitter.
 */
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { fromBaseUnitString, toBaseUnitString } from "@sluice/money";
import { db } from "../db/client.ts";
import { citations, research, resources, type Resource } from "../db/schema.ts";
import { listResources } from "../registry.ts";
import { reason } from "./reasoning.ts";
import { defaultRules } from "./policy.ts";
import { payResource } from "./pay.ts";
import { splitPayment } from "../contracts/splitter.ts";
import { chatJSON, hasOpenAI } from "./openai.ts";

const MAX_CITATIONS = Number(process.env.RESEARCH_MAX_CITATIONS ?? "4");
const EVAL_LIMIT = Number(process.env.RESEARCH_EVAL_LIMIT ?? "12");
const RELEVANCE_THRESHOLD = Number(process.env.RESEARCH_RELEVANCE_THRESHOLD ?? "45");

function buyerKey(): Hex | undefined {
  return (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex | undefined;
}

export interface SplitBreakdown {
  label: string;
  wallet: string;
  pct: number;
  amount: string;
}

function computeSplitBreakdown(splitsJson: string | null, amount: bigint): SplitBreakdown[] | null {
  if (!splitsJson) return null;
  let splits: { label: string; wallet: string; pct: number }[];
  try {
    splits = JSON.parse(splitsJson);
  } catch {
    return null;
  }
  const total = splits.reduce((a, s) => a + s.pct, 0) || 100;
  let sent = 0n;
  return splits.map((s, i) => {
    const amt = i === splits.length - 1 ? amount - sent : (amount * BigInt(Math.round(s.pct * 100))) / BigInt(Math.round(total * 100));
    sent += amt;
    return { label: s.label, wallet: s.wallet, pct: s.pct, amount: toBaseUnitString(amt) };
  });
}

async function synthesize(
  question: string,
  sources: { marker: number; title: string; summary: string | null }[],
): Promise<string> {
  if (sources.length === 0) return "No registered sources were relevant enough to ground an answer.";
  if (hasOpenAI()) {
    try {
      const out = await chatJSON<{ answer: string }>(
        `You are a research assistant. Answer the QUESTION using ONLY the provided SOURCES. Cite inline as [n] using each source's number. Be concise (2-4 sentences). Return JSON {"answer": "..."}.`,
        JSON.stringify({ question, sources }),
        320,
      );
      if (out.answer && typeof out.answer === "string") return out.answer.slice(0, 1200);
    } catch {
      /* fall through to deterministic synthesis */
    }
  }
  // Deterministic synthesis over the real paid sources.
  const refs = sources.map((s) => `[${s.marker}] ${s.title}`).join("; ");
  return `Grounded in ${sources.length} paid source${sources.length === 1 ? "" : "s"}: ${refs}. ${sources
    .map((s) => `${s.summary ? s.summary : s.title} [${s.marker}]`)
    .join(" ")}`.slice(0, 1200);
}

export interface RunResearchResult {
  id: string;
  question: string;
  answer: string;
  mode: "live" | "mock";
  totalPaid: string;
  citations: {
    marker: number;
    resourceName: string;
    sourceUrl: string | null;
    author: string | null;
    amount: string;
    settlementType: string;
    txHash: string | null;
    splits: SplitBreakdown[] | null;
  }[];
}

export async function runResearch(question: string, profileId?: string): Promise<RunResearchResult> {
  const pool = listResources().filter(
    (r) => (r.unitType === "per_citation" || r.unitType === "per_read") && r.contentUrl,
  );
  const candidates = pool.slice(0, EVAL_LIMIT);

  // Reason relevance per candidate.
  const scored: { r: Resource; relevance: number }[] = [];
  for (const r of candidates) {
    const res = await reason(question, defaultRules(), {
      id: r.id,
      name: r.name,
      description: r.description,
      unitType: r.unitType,
      formattedPrice: `$${(Number(r.unitPrice) / 1e6).toFixed(6)}`,
    });
    scored.push({ r, relevance: res.relevance });
  }
  scored.sort((a, b) => b.relevance - a.relevance);
  const selected = scored.filter((s) => s.relevance >= RELEVANCE_THRESHOLD).slice(0, MAX_CITATIONS);

  const id = randomUUID();
  const mode = hasOpenAI() ? "live" : "mock";
  db.insert(research).values({ id, question, mode, profileId: profileId ?? null }).run();

  const out: RunResearchResult["citations"] = [];
  const synthSources: { marker: number; title: string; summary: string | null }[] = [];
  let totalPaid = 0n;
  let marker = 0;

  for (const { r } of selected) {
    const amount = BigInt(r.unitPrice);
    let settlementType: "gateway" | "onchain";
    let txHash: string | null = null;
    let splitsBreakdown: SplitBreakdown[] | null = null;
    try {
      if (r.splitterAddress) {
        const key = buyerKey();
        if (!key) throw new Error("no buyer key for on-chain split");
        const { distributeTx } = await splitPayment(r.splitterAddress as Address, amount, key);
        settlementType = "onchain";
        txHash = distributeTx;
        splitsBreakdown = computeSplitBreakdown(r.splits, amount);
      } else {
        const pres = await payResource(r.path);
        if (!pres.ok) throw new Error(pres.error ?? "gateway pay failed");
        settlementType = "gateway";
      }
    } catch (err) {
      // Couldn't settle this citation → skip it (never fake a paid citation).
      console.error(`citation settle failed for ${r.name}:`, err instanceof Error ? err.message : err);
      continue;
    }

    marker++;
    totalPaid += amount;
    db.insert(citations)
      .values({
        id: randomUUID(),
        researchId: id,
        resourceId: r.id,
        resourceName: r.name,
        sourceUrl: r.contentUrl,
        author: r.author,
        amount: toBaseUnitString(amount),
        settlementType,
        txHash,
        splitterAddress: r.splitterAddress,
        splits: splitsBreakdown ? JSON.stringify(splitsBreakdown) : null,
        marker,
      })
      .run();
    out.push({
      marker,
      resourceName: r.name,
      sourceUrl: r.contentUrl,
      author: r.author,
      amount: toBaseUnitString(amount),
      settlementType,
      txHash,
      splits: splitsBreakdown,
    });
    synthSources.push({ marker, title: r.name, summary: r.description });
  }

  const answer = await synthesize(question, synthSources);
  db.update(research)
    .set({ answer, citationCount: out.length, totalPaid: toBaseUnitString(totalPaid) })
    .where(eq(research.id, id))
    .run();

  return { id, question, answer, mode, totalPaid: toBaseUnitString(totalPaid), citations: out };
}

export function getResearch(id: string) {
  const r = db.select().from(research).where(eq(research.id, id)).get();
  if (!r) return undefined;
  const cites = db.select().from(citations).where(eq(citations.researchId, id)).orderBy(citations.marker).all();
  return { research: r, citations: cites };
}

export function recentResearch(limit = 10) {
  return db.select().from(research).orderBy(desc(research.createdAt)).limit(limit).all();
}

/** Real total cited/earned for a resource (sum of its citation payments, base units). */
export function resourceEarned(resourceId: string): bigint {
  return db
    .select()
    .from(citations)
    .where(eq(citations.resourceId, resourceId))
    .all()
    .reduce((acc, c) => acc + BigInt(c.amount), 0n);
}

export { fromBaseUnitString };
