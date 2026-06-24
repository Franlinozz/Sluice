/** Mock-mode proof: runs parsePolicy + reason with NO OpenAI key (do not source secrets).
 *  Verifies deterministic reasoning so the agent never crashes without a key. */
import { parsePolicy } from "../src/agent/policy.ts";
import { reason } from "../src/agent/reasoning.ts";

const API = process.env.API_URL ?? "http://localhost:3001";
const task = "Research how AI agents pay for content on stablecoin payment rails";
const policy = "Only pay for AI, agent, and stablecoin sources under $0.002 per unit";

console.log("OPENAI_API_KEY present:", Boolean(process.env.OPENAI_API_KEY));

const rules = await parsePolicy(policy);
console.log("parsed rules (mock):", JSON.stringify(rules));

const resources = (await fetch(`${API}/resources`).then((r) => r.json())) as {
  id: string;
  name: string;
  description: string | null;
  unitType: string;
  formattedPrice: string;
}[];

for (const r of resources) {
  const res = await reason(task, rules, {
    id: r.id,
    name: r.name,
    description: r.description,
    unitType: r.unitType,
    formattedPrice: r.formattedPrice,
  });
  console.log(`  [${res.decision.padEnd(4)}] rel=${String(res.relevance).padStart(3)} mode=${res.mode} ${r.name} :: ${res.reason}`);
}
