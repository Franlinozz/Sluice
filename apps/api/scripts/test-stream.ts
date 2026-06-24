/** Streaming meter end-to-end: accrue per second, pause/resume, proof-of-flow auto-pause, stop+settle. */
const API = process.env.API_URL ?? "http://localhost:3001";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function j(method: string, path: string, body?: unknown): Promise<any> {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

async function main() {
  const res = await j("POST", "/resources", {
    name: "Live Compute Stream",
    unitType: "per_second",
    price: "$0.0001",
    path: "live-compute-" + Date.now(),
    author: "Stream Co",
  });
  console.log(`resource: ${res.name} @ ${res.formattedPrice}/sec`);

  let s = await j("POST", "/sessions", { resourceId: res.id, reserveSeconds: 120 });
  const sid = s.id;
  console.log(`session ${sid.slice(0, 8)} · rate ${s.formattedRate}/s · reserve ${s.formattedReserve} · ${s.status}`);

  for (let i = 0; i < 4; i++) {
    await sleep(1000);
    await j("POST", `/sessions/${sid}/heartbeat`);
  }
  s = await j("GET", `/sessions/${sid}`);
  console.log(`+4s flowing  -> accrued ${s.formattedAccrued} (${s.flowedSeconds}s) · ${s.status}`);

  s = await j("POST", `/sessions/${sid}/pause`);
  const frozen = s.accrued;
  await sleep(2500);
  s = await j("GET", `/sessions/${sid}`);
  console.log(`paused 2.5s  -> accrued ${s.formattedAccrued} · frozen=${s.accrued === frozen} · ${s.status}`);

  await j("POST", `/sessions/${sid}/resume`);
  for (let i = 0; i < 3; i++) {
    await sleep(1000);
    await j("POST", `/sessions/${sid}/heartbeat`);
  }
  s = await j("GET", `/sessions/${sid}`);
  console.log(`resume +3s   -> accrued ${s.formattedAccrued} (${s.flowedSeconds}s) · ${s.status}`);

  console.log("simulating heartbeat loss (7s, no heartbeat)...");
  await sleep(7000);
  s = await j("GET", `/sessions/${sid}`);
  console.log(`flow lost    -> ${s.status} (flowPaused=${s.flowPaused}) accrued ${s.formattedAccrued}`);

  s = await j("POST", `/sessions/${sid}/heartbeat`);
  console.log(`heartbeat back -> ${s.status} (auto-resumed)`);

  const stop = await j("POST", `/sessions/${sid}/stop`);
  console.log(
    `stopped      -> ${stop.settledSeconds}s settled = ${stop.session.formattedSettledAmount} · paid=${stop.paid} ${stop.error ?? ""}`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
