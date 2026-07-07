/**
 * The autonomous buyer agent loop. Discovers priced resources, REASONS per resource, then
 * ENFORCES the budget/ceiling/allowed-units deterministically before paying (raw model output
 * never authorizes a payment). Pays via the Phase 1 core → payments appear in /app/settlements.
 */
import { randomUUID } from "node:crypto";
import { parseUSDC } from "@sluice/money";
import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { agents, decisions, runs, type Run } from "../db/schema.ts";
import { listResources } from "../registry.ts";
import { agentRules, getAgent } from "./store.ts";
import { reason } from "./reasoning.ts";
import { hasOpenAI } from "./openai.ts";
import { ensureDeposit, payExternal, payResource } from "./pay.ts";

const MAX_STEPS = Number(process.env.AGENT_MAX_STEPS ?? "12");

export async function runAgentSession(agentId: string): Promise<Run> {
  const agent = getAgent(agentId);
  if (!agent) throw new Error("agent not found");
  const rules = agentRules(agent);
  const budget = BigInt(agent.budget);

  const runId = randomUUID();
  const mode = hasOpenAI() ? "live" : "mock";
  db.insert(runs).values({ id: runId, agentId, status: "running", mode }).run();

  // Candidate ranking (MAX_STEPS caps the session, so ORDER decides what the agent ever sees):
  // 1) policy-eligible unit types first; 2) resources whose name/description matches the agent's
  //    topics first (cheap deterministic prefilter — the LLM still scores each one; this only
  //    stops a burst of freshly-ingested off-topic feed items from crowding relevant resources
  //    out of the session entirely); 3) newest first within each tier.
  const eligible = (u: string) => !rules.allowedUnitTypes || rules.allowedUnitTypes.includes(u as never);
  // Word-boundary matching — short topics like "ai" must not substring-match "Laity"/"aircraft".
  const topicRes = (rules.topics ?? []).map(
    (t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
  );
  const topicHit = (r: { name: string; description: string | null }) => {
    if (topicRes.length === 0) return 0;
    const hay = `${r.name} ${r.description ?? ""}`;
    return topicRes.some((re) => re.test(hay)) ? 0 : 1;
  };
  const resources = listResources()
    .sort((a, b) => {
      const ea = eligible(a.unitType) ? 0 : 1;
      const eb = eligible(b.unitType) ? 0 : 1;
      if (ea !== eb) return ea - eb;
      const ta = topicHit(a);
      const tb = topicHit(b);
      if (ta !== tb) return ta - tb;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, MAX_STEPS);
  // Make sure we have a little Gateway balance to spend.
  await ensureDeposit(budget > 0n ? budget : 100_000n);

  let spent = 0n;
  let value = 0;
  let steps = 0;
  let paused = false;

  for (const r of resources) {
    steps++;
    const result = await reason(agent.task, rules, {
      id: r.id,
      name: r.name,
      description: r.description,
      unitType: r.unitType,
      formattedPrice: `$${(Number(r.unitPrice) / 1e6).toFixed(6)}`,
    });

    const price = BigInt(r.unitPrice);
    let decision: "pay" | "skip" | "capped" = result.decision === "pay" ? "pay" : "skip";
    let reasonText = result.reason;
    let paid = false;
    let amount: string | null = null;
    let paymentRef: string | null = null;

    if (decision === "pay") {
      if (rules.allowedUnitTypes && !rules.allowedUnitTypes.includes(r.unitType)) {
        decision = "skip";
        reasonText += ` — policy excludes ${r.unitType}.`;
      } else if (rules.priceCeiling && price > BigInt(rules.priceCeiling)) {
        decision = "capped";
        reasonText += ` — price exceeds the policy ceiling.`;
      } else if (spent + price > budget) {
        decision = "capped";
        reasonText += ` — would exceed the budget; pausing for more allowance.`;
        paused = true;
      } else {
        // partner endpoints (cross-team exchange): pay THEIR x402 URL directly
        const ext = (() => {
          try {
            return r.metadata ? (JSON.parse(r.metadata) as { externalUrl?: string }).externalUrl : undefined;
          } catch {
            return undefined;
          }
        })();
        const pres = ext ? await payExternal(ext) : await payResource(r.path);
        if (pres.ok) {
          paid = true;
          // external endpoints set their OWN price in their 402 — record what was actually paid
          let actual = price;
          if (ext && pres.amount) {
            try {
              actual = parseUSDC(pres.amount);
            } catch {
              actual = price;
            }
          }
          spent += actual;
          value += result.relevance;
          amount = actual.toString();
          paymentRef = pres.amount ?? null;
        } else {
          decision = "skip";
          reasonText += ` — payment failed (${pres.error}).`;
        }
      }
    }

    db.insert(decisions)
      .values({
        id: randomUUID(),
        runId,
        resourceId: r.id,
        resourceName: r.name,
        decision,
        relevance: result.relevance,
        reason: reasonText,
        amount,
        paid,
        paymentRef,
      })
      .run();

    db.update(runs).set({ spent: spent.toString(), value, steps }).where(eq(runs.id, runId)).run();

    if (paused) break;
  }

  db.update(runs)
    .set({
      status: paused ? "paused" : "completed",
      spent: spent.toString(),
      value,
      steps,
      finishedAt: new Date(),
      note: paused ? "Budget cap reached — increase allowance to continue." : null,
    })
    .where(eq(runs.id, runId))
    .run();

  return db.select().from(runs).where(eq(runs.id, runId)).get()!;
}

export { agents };
