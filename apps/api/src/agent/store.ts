/** DB access for agents / runs / decisions. */
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { parseUSDC, toBaseUnitString } from "@sluice/money";
import { db } from "../db/client.ts";
import { agents, decisions, runs, type Agent, type Decision, type Run } from "../db/schema.ts";
import { parsePolicy, type AgentRules } from "./policy.ts";

export interface CreateAgentInput {
  name: string;
  task: string;
  /** Human budget, e.g. "$0.05". */
  budget: string;
  policy?: string;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const budget = toBaseUnitString(parseUSDC(input.budget));
  const rules = await parsePolicy(input.policy);
  const id = randomUUID();
  db.insert(agents)
    .values({
      id,
      name: input.name,
      task: input.task,
      budget,
      policy: input.policy ?? null,
      rules: JSON.stringify(rules),
    })
    .run();
  return db.select().from(agents).where(eq(agents.id, id)).get()!;
}

export function listAgents(): Agent[] {
  return db.select().from(agents).orderBy(desc(agents.createdAt)).all();
}

export function getAgent(id: string): Agent | undefined {
  return db.select().from(agents).where(eq(agents.id, id)).get();
}

export function agentRules(agent: Agent): AgentRules {
  try {
    return JSON.parse(agent.rules ?? "{}") as AgentRules;
  } catch {
    return { priceCeiling: null, allowedUnitTypes: null, topics: [], relevanceThreshold: 50 };
  }
}

export function listRuns(agentId: string): Run[] {
  return db.select().from(runs).where(eq(runs.agentId, agentId)).orderBy(desc(runs.startedAt)).all();
}

export function getRun(id: string): Run | undefined {
  return db.select().from(runs).where(eq(runs.id, id)).get();
}

export function getDecisions(runId: string): Decision[] {
  return db.select().from(decisions).where(eq(decisions.runId, runId)).orderBy(decisions.createdAt).all();
}

export function latestRun(agentId: string): Run | undefined {
  return db.select().from(runs).where(eq(runs.agentId, agentId)).orderBy(desc(runs.startedAt)).get();
}
