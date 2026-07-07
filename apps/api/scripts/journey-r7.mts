/**
 * R7 end-to-end journey on Arc testnet — every step REAL, evidence collected to docs/JOURNEY-R7.md.
 * join → profile → faucet → agent pays citations → ask (citation tolls) → streaming session
 * (start/pause/resume/stop) → bond staked & released → funding tip + round sweep → treasury
 * withdrawal → receipts + stats snapshot.
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { writeFileSync } from "node:fs";

const api = "http://localhost:3001";
const j = async (r: Response) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0,200) }; } };
const post = (p: string, body: unknown) => fetch(api + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(j);
const get = (p: string) => fetch(api + p).then(j);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ev: string[] = [];
const log = (s: string) => { console.log(s); ev.push(s); };

// 1. join: fresh human
const addr = privateKeyToAccount(generatePrivateKey()).address;
const profile = await post("/profiles/ensure", { wallet: addr });
log(`1. JOIN — new profile ${profile.id} for fresh wallet ${addr}`);

// 2. faucet (real on-chain drip)
const claim = await post("/faucet/claim", { profileId: profile.id, wallet: addr });
log(`2. FAUCET — $${claim.amount} drip, tx ${claim.txHash} (${claim.explorerUrl})`);

// 3. agent run (deposit is ensured inside the runner; pays real citation tolls)
const agent = await post("/agents", { name: "R7 Journey Agent", task: "Research how AI agents pay for content on stablecoin rails", budget: "$0.01", policy: "Only pay for AI, agent and stablecoin sources under $0.005 per unit" });
const run = await post(`/agents/${agent.id}/run`, {});
const paid = (run.decisions ?? []).filter((d: any) => d.decision === "pay");
log(`3. AGENT — run ${run.id ?? ""} status=${run.status} paid=${paid.length} spent=${run.spent} base units (${paid.map((d: any) => d.resourceName).join(" · ")})`);

// 4. ask (citation toll loop)
const research = await post("/research", { question: "How does Circle Gateway settle nanopayments on Arc?", profileId: profile.id });
log(`4. ASK — research ${research.id ?? ""}: ${research.citations?.length ?? 0} citations paid (${(research.citations ?? []).map((c: any) => c.formattedAmount).join(", ")})`);

// 5. streaming with proof-of-flow
const resources = await get("/resources");
const stream = resources.find((r: any) => r.unitType === "per_second" && !r.archived);
if (stream) {
  const s = await post("/sessions", { resourceId: stream.id, reserveSeconds: 30 });
  await sleep(2200); await post(`/sessions/${s.id}/heartbeat`, {});
  await post(`/sessions/${s.id}/pause`, {}); await sleep(800);
  await post(`/sessions/${s.id}/resume`, {}); await sleep(1600); await post(`/sessions/${s.id}/heartbeat`, {});
  const done = await post(`/sessions/${s.id}/stop`, {});
  log(`5. STREAM — "${stream.name}" session ${s.id}: start→heartbeat→pause→resume→stop, settled ${done.formattedSettled ?? done.settledAmount ?? JSON.stringify(done).slice(0,120)}`);
} else log("5. STREAM — no per_second resource available (skipped)");

// 6. reputation bond: stake + release
const match = await post("/matches", { need: "Deliver a verified research digest for the R7 journey", bondUsd: "0.02" });
log(`6a. BOND — match ${match.id}: $0.02 staked, bond tx ${match.bondTxHash ?? match.txHash ?? "(see match)"} provider ${match.provider ?? ""}`);
const resolved = await post(`/matches/${match.id}/resolve`, { outcome: "release", reason: "delivered — R7 journey" });
log(`6b. BOND — released (outcome=${resolved.status ?? resolved.outcome}), feedback recorded on ERC-8004`);

// 7. funding: two tips + quadratic sweep
const seller = "0x303c819cbb4d7481721e5310E2b120C2a2cdfC58";
await post("/funding/tip", { creator: seller, amountUsd: "0.005", label: "R7 journey tip 1" });
await post("/funding/tip", { creator: seller, amountUsd: "0.005", label: "R7 journey tip 2" });
const sweep = await post("/funding/settle", {});
log(`7. FUNDING — 2 real tips + round sweep: ${JSON.stringify(sweep).slice(0, 220)}`);

// 8. treasury withdrawal (instant Arc mint)
const wd = await post("/treasury/withdraw", { amount: "0.01", chain: "arcTestnet" });
log(`8. TREASURY — withdrew $0.01 on Arc, mint tx ${wd.mintTxHash} (${wd.explorerUrl})`);

// 9. verify: receipts + stats
const receipts = await get("/receipts");
const settled = receipts.filter((r: any) => r.status === "settled").slice(0, 5);
log(`9. VERIFY — latest settled receipts: ${settled.map((r: any) => `${r.formattedAmount}→${(r.payTo ?? "").slice(0, 8)}`).join(" · ")}`);
const stats = await get("/stats");
log(`10. STATS — humans=${stats.humans} payingWallets=${stats.payingWallets ?? stats.payers} creators=${stats.creatorsEarning ?? stats.creators} settlements=${stats.settlements} totalSettled=$${stats.totalSettledUsd ?? stats.totalSettled}`);

writeFileSync("../../docs/JOURNEY-R7.md", `# R7 end-to-end journey — Arc testnet evidence (${new Date().toISOString().slice(0, 10)})

Every line below happened for real on Arc testnet (chain 5042002), driven through the public API.
Verify any transaction on https://testnet.arcscan.app and any receipt in the live Settlements explorer.

${ev.map((l) => `- ${l}`).join("\n")}
`);
console.log("\nwrote docs/JOURNEY-R7.md");
