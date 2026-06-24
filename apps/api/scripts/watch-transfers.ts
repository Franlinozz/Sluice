import "../src/env.ts";
import { GatewayClient } from "@circle-fin/x402-batching/client";

const pk = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as `0x${string}`;
const gateway = new GatewayClient({ chain: "arcTestnet", privateKey: pk });
const ids = process.argv.slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const last: Record<string, string> = {};
  for (let i = 0; i < 120; i++) {
    for (const id of ids) {
      try {
        const t = (await gateway.getTransferById(id)) as Record<string, unknown>;
        const s = String(t.status);
        if (s !== last[id]) {
          console.log(`[${new Date().toISOString()}] ${id.slice(0, 8)} → ${s}`);
          if (s !== "received") console.log("  " + JSON.stringify(t));
          last[id] = s;
        }
      } catch (e) {
        console.log(`  ${id.slice(0, 8)} err ${e instanceof Error ? e.message : e}`);
      }
    }
    if (ids.every((id) => ["confirmed", "completed", "failed"].includes(last[id] ?? ""))) {
      console.log("All terminal.");
      break;
    }
    await sleep(30_000);
  }
}
main().catch((e) => console.error(e));
