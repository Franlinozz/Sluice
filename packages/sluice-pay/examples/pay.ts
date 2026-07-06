/**
 * 10-line example: discover a Sluice resource and pay for it on Arc with a real nanopayment.
 *
 *   SLUICE_API=https://sluiceflow.vercel.app/gw PK=0x... pnpm --filter @sluice/pay example
 */
import { SluicePay } from "../src/index.ts";

const sluice = new SluicePay({
  privateKey: process.env.PK as `0x${string}`,
  apiBase: process.env.SLUICE_API, // defaults to the public Sluice API
});

const resources = await sluice.discover();
const resource = resources.find((r) => r.unitType === "per_request") ?? resources[0]!;
const { data, amount } = await sluice.pay(resource.id, { maxAmount: 0.05, reason: "sdk demo" });

console.log(`✅ paid ${amount} USDC for "${resource.name}" on Arc`);
console.log("   response:", JSON.stringify(data).slice(0, 200));
console.log("   total spent this session:", Number(sluice.totalSpent()) / 1e6, "USDC");
