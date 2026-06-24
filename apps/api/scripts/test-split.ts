/** On-chain proof: deploy a RoyaltySplitter (70/30), fund it, distribute, verify payouts on Arc. */
import "../src/env.ts";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { erc20Abi, type Address, type Hex } from "viem";
import { arcConfig, getClient, explorerTxUrl } from "@sluice/chain";
import { formatUSDC } from "@sluice/money";
import { deploySplitter, splitPayment } from "../src/contracts/splitter.ts";

const payerKey = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex;

async function usdc(addr: Address): Promise<bigint> {
  return getClient().readContract({ address: arcConfig.usdcToken, abi: erc20Abi, functionName: "balanceOf", args: [addr] });
}

async function main() {
  const a = privateKeyToAccount(generatePrivateKey()).address;
  const b = privateKeyToAccount(generatePrivateKey()).address;
  console.log("collaborators:", a, "(70%)", b, "(30%)");

  const splitter = await deploySplitter([
    { label: "Lead", wallet: a, pct: 70 },
    { label: "Co", wallet: b, pct: 30 },
  ]);
  console.log("splitter deployed:", splitter, explorerTxUrl(splitter).replace("/tx/", "/address/"));

  const amount = 10_000n; // $0.01
  const res = await splitPayment(splitter, amount, payerKey);
  console.log("transfer tx:", explorerTxUrl(res.transferTx));
  console.log("distribute tx:", explorerTxUrl(res.distributeTx));

  const [ba, bb] = await Promise.all([usdc(a), usdc(b)]);
  console.log(`payout A: ${formatUSDC(ba)} USDC (expect 0.007)`);
  console.log(`payout B: ${formatUSDC(bb)} USDC (expect 0.003)`);
  console.log(ba === 7000n && bb === 3000n ? "✅ split correct" : "❌ split mismatch");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
