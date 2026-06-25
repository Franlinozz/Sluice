/**
 * Seed a real quadratic-funding round and settle it on Arc — demonstrating that BREADTH beats SIZE.
 * C1 is backed by 3 small tips; C2 by one equal-sized tip. Same raised total, but C1 is matched far
 * more. All tips and the settlement sweep are real on-chain transactions.
 *
 *   pnpm --filter @sluice/api exec tsx scripts/seed-funding.ts
 */
import "../src/env.ts";
import { parseEther, erc20Abi, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arcConfig, getClient, getWalletClient } from "@sluice/chain";
import { formatUSDC } from "@sluice/money";
import { addTip, settleRound, previewRound } from "../src/funding/pool.ts";

const opKey = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex;
const sellerKey = process.env.SELLER_PRIVATE_KEY as Hex;

async function fund(to: `0x${string}`, usdc: bigint) {
  const op = getWalletClient(opKey);
  const client = getClient();
  const gas = await op.sendTransaction({ to, value: parseEther("0.05"), account: op.account!, chain: op.chain } as never);
  await client.waitForTransactionReceipt({ hash: gas });
  const u = await op.writeContract({
    address: arcConfig.usdcToken,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, usdc],
    account: op.account!,
    chain: op.chain,
  });
  await client.waitForTransactionReceipt({ hash: u });
}

async function main() {
  // Creators (fresh wallets that receive matches) + a third backer (fresh, funded).
  const C1 = privateKeyToAccount(generatePrivateKey()).address;
  const C2 = privateKeyToAccount(generatePrivateKey()).address;
  const C3 = privateKeyToAccount(generatePrivateKey()).address;
  const b3Key = generatePrivateKey();
  const B3 = privateKeyToAccount(b3Key).address;

  console.log("Funding a fresh backer (B3)…");
  await fund(B3, 50_000n); // 0.05 USDC + gas

  console.log("Posting real tips…");
  // C1 — breadth: three backers, $0.01 each
  await addTip({ creator: C1, amountUsd: "0.01", label: "Indie Newsroom" }, opKey);
  await addTip({ creator: C1, amountUsd: "0.01", label: "Indie Newsroom" }, sellerKey);
  await addTip({ creator: C1, amountUsd: "0.01", label: "Indie Newsroom" }, b3Key);
  // C2 — size: one backer, $0.03 (same raised as C1)
  await addTip({ creator: C2, amountUsd: "0.03", label: "Sponsored Blog" }, opKey);
  // C3 — partial breadth: two backers, $0.005 each
  await addTip({ creator: C3, amountUsd: "0.005", label: "Open Dataset" }, opKey);
  await addTip({ creator: C3, amountUsd: "0.005", label: "Open Dataset" }, sellerKey);

  const preview = await previewRound();
  console.log(`\nRound ${preview.round} preview (pool budget will be funded to cover matches):`);
  for (const c of preview.creators) {
    console.log(
      `  ${c.label?.padEnd(16)} backers=${c.backers}  raised=$${formatUSDC(c.raised)}  → match=$${formatUSDC(c.match)}`,
    );
  }
  console.log(`  matchTotal=$${formatUSDC(preview.matchTotal)}  α=${preview.alpha}`);

  console.log("\nSettling (single-sweep distribute on FundingPool)…");
  const res = await settleRound();
  console.log(`  distribute tx: ${arcConfig.explorerUrl}/tx/${res.distributeTx}`);
  if (res.fundTx) console.log(`  pool fund tx:  ${arcConfig.explorerUrl}/tx/${res.fundTx}`);
  console.log(`  matchTotal: $${formatUSDC(BigInt(res.matchTotal))} across ${res.payouts.length} creators`);
  console.log("\n✅ breadth-beats-size demonstrated with real settlement");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
