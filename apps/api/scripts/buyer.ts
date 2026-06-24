/**
 * Buyer test client — the real on-chain proof of the Phase 1 spine.
 *
 * Flow: deposit USDC into the Gateway Wallet (one-time) → pay the paywalled endpoint N times
 * (402 → sign EIP-3009 against the Gateway Wallet → verify → 200) → trigger a batch settle →
 * print the real receipt + the Arcscan link → re-verify on-chain.
 *
 * Run: pnpm --filter @sluice/api exec tsx scripts/buyer.ts
 * Env: API_URL, RESOURCE_PATH, PAY_COUNT, DEPOSIT_AMOUNT, BUYER_PRIVATE_KEY|ARC_WALLET_PRIVATE_KEY
 */
import "../src/env.ts";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { parseUnits } from "viem";

const API = process.env.API_URL ?? "http://localhost:3001";
const RESOURCE_PATH = process.env.RESOURCE_PATH ?? "premium-quote";
const PAY_COUNT = Number(process.env.PAY_COUNT ?? "5");
const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT ?? "0.5";

const pk = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as
  | `0x${string}`
  | undefined;
if (!pk) {
  console.error("Missing BUYER_PRIVATE_KEY / ARC_WALLET_PRIVATE_KEY");
  process.exit(1);
}

const gateway = new GatewayClient({ chain: "arcTestnet", privateKey: pk });

function line() {
  console.log("─".repeat(64));
}

async function main() {
  console.log(`Buyer: ${gateway.address}`);
  console.log(`API:   ${API}  ·  resource: /paid/${RESOURCE_PATH}`);
  line();

  // 1. Balances
  const before = await gateway.getBalances();
  console.log(`Wallet USDC:        ${before.wallet.formatted}`);
  console.log(`Gateway available:  ${before.gateway.formattedAvailable}`);

  // 2. One-time deposit if the Gateway balance is low
  const needed = parseUnits(DEPOSIT_AMOUNT, 6);
  if (before.gateway.available < needed) {
    console.log(`\nDepositing ${DEPOSIT_AMOUNT} USDC into the Gateway Wallet (one-time)…`);
    const dep = await gateway.deposit(DEPOSIT_AMOUNT);
    console.log(`  deposit tx: ${dep.depositTxHash}`);
    const updated = await gateway.getBalances();
    console.log(`  Gateway available now: ${updated.gateway.formattedAvailable}`);
  }
  line();

  // 3. Pay N times (each accrues a verified sub-floor unit). Paced + retried to respect
  //    Circle Gateway's rate limit (the reference agent paces at ~1 tx/sec).
  const DELAY_MS = Number(process.env.PAY_DELAY_MS ?? "350");
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  console.log(`Paying ${PAY_COUNT}× (≈${DELAY_MS}ms apart)…`);
  let paid = 0;
  for (let i = 0; i < PAY_COUNT; i++) {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const res = await gateway.pay<{ status: string; resource: unknown }>(
          `${API}/paid/${RESOURCE_PATH}`,
        );
        paid++;
        ok = true;
        console.log(
          `  #${i + 1} status=${res.status} amount=${res.formattedAmount} tx=${res.transaction || "(deferred → batch)"}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === 2) console.error(`  #${i + 1} FAILED: ${msg}`);
        else await sleep(800 * (attempt + 1)); // back off on transient (503/rate-limit)
      }
    }
    await sleep(DELAY_MS);
  }
  console.log(`Paid ${paid}/${PAY_COUNT}.`);
  line();

  // 4. Trigger the batch settlement
  console.log("Triggering batch settlement…");
  const settle = await fetch(`${API}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }).then((r) => r.json() as Promise<{ settled: number; receipts: Record<string, unknown>[] }>);
  console.log(`  settled groups: ${settle.settled}`);
  for (const r of settle.receipts ?? []) {
    console.log(
      `  receipt ${r.id}: ${r.units} ${r.unitType} = ${r.formattedAmount} via ${r.backend}`,
    );
    console.log(`    batch tx: ${r.batchTxHash ?? "(none)"}`);
    console.log(`    explorer: ${r.explorerUrl ?? "(none)"}`);

    // 5. Re-verify on-chain
    const v = await fetch(`${API}/receipts/${r.id}/verify`, { method: "POST" }).then((x) =>
      x.json(),
    );
    console.log(`    verify:   ${JSON.stringify(v)}`);
  }
  line();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
