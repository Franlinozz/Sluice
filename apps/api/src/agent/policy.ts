/**
 * Plain-English spend policy → structured, ENFORCEABLE rules. Parsed with the LLM (with a
 * deterministic mock fallback). The runner enforces these deterministically — raw model output
 * NEVER authorizes a payment (CLAUDE.md agent rules).
 */
import { parseUSDC, toBaseUnitString } from "@sluice/money";
import { UNIT_TYPES, type UnitType } from "../db/schema.ts";
import { chatJSON, hasOpenAI } from "./openai.ts";

export interface AgentRules {
  /** Max price per unit the agent will pay (base units, string) or null for no ceiling. */
  priceCeiling: string | null;
  /** Allowed unit types, or null for all. */
  allowedUnitTypes: UnitType[] | null;
  /** Topic keywords the agent cares about (lowercased). */
  topics: string[];
  /** Pay only if relevance ≥ this (0..100). */
  relevanceThreshold: number;
}

export function defaultRules(): AgentRules {
  return { priceCeiling: null, allowedUnitTypes: null, topics: [], relevanceThreshold: 50 };
}

const STOP = new Set([
  "the","a","an","and","or","for","to","of","in","on","with","under","over","only","pay","per",
  "max","up","at","most","cents","cent","dollar","dollars","usdc","resources","resource","sources",
  "source","i","want","that","are","is","be","this","my","me","we","our","than","less","below",
  "unit","units","price","cost","each","when","grounds","cite","cited","citing",
]);

function keywords(s: string): string[] {
  return [
    ...new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)),
    ),
  ];
}

function mockParsePolicy(policy: string): AgentRules {
  const rules = defaultRules();
  // price ceiling: "$0.005" / "under 0.01" / "0.5 cents"
  const dollar = policy.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:usdc|dollars?)?/i);
  const centMatch = policy.match(/(\d+(?:\.\d+)?)\s*cents?/i);
  if (centMatch) {
    const cents = Number(centMatch[1]);
    rules.priceCeiling = toBaseUnitString(BigInt(Math.round(cents * 10_000)));
  } else if (/under|below|less than|max|cap/i.test(policy) && dollar) {
    try {
      rules.priceCeiling = toBaseUnitString(parseUSDC(dollar[1]!));
    } catch {
      /* ignore */
    }
  }
  // allowed unit types mentioned
  const mentioned = UNIT_TYPES.filter((u) => policy.toLowerCase().includes(u.replace("per_", "")));
  if (mentioned.length) rules.allowedUnitTypes = mentioned;
  // topics
  rules.topics = keywords(policy).slice(0, 8);
  return rules;
}

const SYS = `You convert a plain-English spend policy for a budget-bound buyer agent into strict JSON rules.
Return ONLY: {"priceCeilingUsd": number|null, "allowedUnitTypes": string[]|null, "topics": string[], "relevanceThreshold": number}
- priceCeilingUsd: max price per unit in USD (e.g. 0.005), or null.
- allowedUnitTypes: subset of [per_request,per_citation,per_second,per_byte,per_token,per_listen,per_view] or null.
- topics: lowercase keywords the agent cares about.
- relevanceThreshold: 0-100 (default 50).`;

export async function parsePolicy(policy: string | null | undefined): Promise<AgentRules> {
  if (!policy || !policy.trim()) return defaultRules();
  if (hasOpenAI()) {
    try {
      const out = await chatJSON<{
        priceCeilingUsd: number | null;
        allowedUnitTypes: string[] | null;
        topics: string[];
        relevanceThreshold: number;
      }>(SYS, policy);
      const allowed = Array.isArray(out.allowedUnitTypes)
        ? (out.allowedUnitTypes.filter((u) => (UNIT_TYPES as readonly string[]).includes(u)) as UnitType[])
        : null;
      return {
        priceCeiling:
          out.priceCeilingUsd != null && out.priceCeilingUsd > 0
            ? toBaseUnitString(parseUSDC(String(out.priceCeilingUsd)))
            : null,
        allowedUnitTypes: allowed && allowed.length ? allowed : null,
        topics: Array.isArray(out.topics) ? out.topics.map((t) => t.toLowerCase()).slice(0, 10) : [],
        relevanceThreshold:
          Number.isFinite(out.relevanceThreshold) && out.relevanceThreshold > 0
            ? Math.min(100, Math.max(0, Math.round(out.relevanceThreshold)))
            : 50,
      };
    } catch {
      /* fall through to mock */
    }
  }
  return mockParsePolicy(policy);
}

export { keywords };
