/**
 * Sluice buyer-agent runtime (CLI). Creates a budget-bound agent and runs autonomous sessions
 * against the Sluice API — discover → reason → pay/skip/cap → settle. The "always-on buyer".
 *
 * Usage:
 *   pnpm --filter @sluice/agent dev
 *   API_URL=... AGENT_TASK="..." AGENT_BUDGET="$0.01" AGENT_POLICY="..." tsx src/index.ts [--loop 30]
 */
const API = process.env.API_URL ?? "http://localhost:3001";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const task =
  process.env.AGENT_TASK ?? "Research how AI agents pay for content on stablecoin payment rails";
const budget = process.env.AGENT_BUDGET ?? "$0.01";
const policy =
  process.env.AGENT_POLICY ?? "Only pay for AI, agent, and stablecoin payment sources under $0.005 per unit";
const name = process.env.AGENT_NAME ?? "Citation Research Agent";
const loopSecs = Number(arg("--loop") ?? "0");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Decision {
  decision: string;
  relevance: number;
  resourceName: string;
  reason: string;
  paid: boolean;
  formattedAmount: string | null;
}
interface RunResult {
  id: string;
  status: string;
  mode: string;
  formattedSpent: string;
  value: number;
  avgRelevance: number | null;
  paidCount: number | null;
  steps: number;
  note: string | null;
  decisions: Decision[];
}

async function ensureAgent(): Promise<string> {
  const r = await fetch(`${API}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, task, budget, policy }),
  });
  if (!r.ok) throw new Error(`create agent failed: ${r.status} ${await r.text()}`);
  const a = (await r.json()) as { id: string; formattedBudget: string; rules: unknown };
  console.log(`Agent: ${name}  ·  budget ${a.formattedBudget}`);
  console.log(`Task: ${task}`);
  console.log(`Rules: ${JSON.stringify(a.rules)}`);
  return a.id;
}

async function runOnce(agentId: string): Promise<void> {
  const r = await fetch(`${API}/agents/${agentId}/run`, { method: "POST" });
  if (!r.ok) throw new Error(`run failed: ${r.status} ${await r.text()}`);
  const run = (await r.json()) as RunResult;
  console.log("─".repeat(64));
  console.log(
    `Run ${run.id.slice(0, 8)} · ${run.mode} · ${run.status} · spent ${run.formattedSpent} · ` +
      `paid ${run.paidCount}/${run.steps} · value ${run.value}` +
      (run.avgRelevance != null ? ` · avg rel ${run.avgRelevance}` : ""),
  );
  for (const d of run.decisions) {
    const amt = d.paid ? ` ${d.formattedAmount}` : "";
    console.log(`  [${d.decision.padEnd(6)}] rel=${String(d.relevance).padStart(3)} ${d.resourceName}${amt}`);
    console.log(`           ${d.reason}`);
  }
  if (run.note) console.log(`  note: ${run.note}`);
}

async function main() {
  console.log(`Sluice agent → ${API}`);
  const agentId = await ensureAgent();
  await runOnce(agentId);
  if (loopSecs > 0) {
    console.log(`\nLooping every ${loopSecs}s (Ctrl-C to stop)…`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await sleep(loopSecs * 1000);
      try {
        await runOnce(agentId);
      } catch (e) {
        console.error("run error:", e instanceof Error ? e.message : e);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
