/**
 * Per-resource reasoning: does paying for THIS resource serve the task? Reasons about content
 * value (not just availability). gpt-4o-mini (cheap, token-capped) with deterministic mock fallback.
 * Cached per (task, resource). The runner enforces budget/ceiling on top — this only recommends.
 */
import { keywords, type AgentRules } from "./policy.ts";
import { chatJSON, hasOpenAI } from "./openai.ts";

export interface ReasonResource {
  id: string;
  name: string;
  description: string | null;
  unitType: string;
  formattedPrice: string;
}

export interface ReasonResult {
  relevance: number; // 0..100
  decision: "pay" | "skip";
  reason: string;
  mode: "live" | "mock";
}

const cache = new Map<string, ReasonResult>();

const SYS = `You are a budget-bound research buyer agent. Given a TASK and a candidate priced RESOURCE,
judge how useful paying for it would be FOR THE TASK — reason about content value, not mere availability.
Return ONLY JSON: {"relevance": <0-100 integer>, "decision": "pay" | "skip", "reason": "<one sentence>"}.
Recommend "pay" only if genuinely relevant and worth its price for the task.`;

function mockReason(task: string, rules: AgentRules, resource: ReasonResource): ReasonResult {
  const taskKw = new Set([...keywords(task), ...rules.topics]);
  const resKw = keywords(`${resource.name} ${resource.description ?? ""}`);
  let overlap = 0;
  for (const w of resKw) if (taskKw.has(w)) overlap++;
  const relevance = Math.min(100, overlap * 30);
  const decision = relevance >= rules.relevanceThreshold ? "pay" : "skip";
  const reason =
    decision === "pay"
      ? `Relevant to the task — ${overlap} topic match${overlap === 1 ? "" : "es"} (${relevance}/100).`
      : `Off-topic for the task (${relevance}/100 < ${rules.relevanceThreshold} threshold).`;
  return { relevance, decision, reason, mode: "mock" };
}

export async function reason(
  task: string,
  rules: AgentRules,
  resource: ReasonResource,
): Promise<ReasonResult> {
  const cacheKey = `${task}::${resource.id}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let result: ReasonResult;
  if (hasOpenAI()) {
    try {
      const out = await chatJSON<{ relevance: number; decision: string; reason: string }>(
        SYS,
        JSON.stringify({
          task,
          resource: {
            name: resource.name,
            description: resource.description,
            unitType: resource.unitType,
            price: resource.formattedPrice,
          },
          relevanceThreshold: rules.relevanceThreshold,
          topics: rules.topics,
        }),
      );
      const relevance = Math.min(100, Math.max(0, Math.round(Number(out.relevance) || 0)));
      result = {
        relevance,
        decision: out.decision === "pay" ? "pay" : "skip",
        reason: String(out.reason ?? "").slice(0, 240) || "(no reason given)",
        mode: "live",
      };
    } catch {
      result = mockReason(task, rules, resource);
    }
  } else {
    result = mockReason(task, rules, resource);
  }
  cache.set(cacheKey, result);
  return result;
}
