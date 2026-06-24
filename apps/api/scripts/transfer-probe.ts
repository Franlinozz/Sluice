import "../src/env.ts";
import { GatewayClient } from "@circle-fin/x402-batching/client";

const pk = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as `0x${string}`;
const gateway = new GatewayClient({ chain: "arcTestnet", privateKey: pk });
const id = process.argv[2];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!id) {
    console.log("usage: transfer-probe <transferId>");
    return;
  }
  let last = "";
  for (let i = 0; i < 30; i++) {
    const t = (await gateway.getTransferById(id)) as Record<string, unknown>;
    const status = String(t.status);
    if (status !== last) {
      console.log(`\n[${i}] status=${status} keys=${Object.keys(t).join(",")}`);
      console.log(JSON.stringify(t, null, 2));
      last = status;
    } else {
      process.stdout.write(`.`);
    }
    if (status === "confirmed" || status === "completed" || status === "failed") break;
    await sleep(8000);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
