/** Deploy FundingPool (Phase 10) to Arc and merge its address into deployed.json. */
import "../src/env.ts";
import { type Hex } from "viem";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { arcConfig, getClient, getWalletClient, explorerTxUrl, explorerAddressUrl } from "@sluice/chain";
import { fundingPoolAbi, fundingPoolBytecode } from "../src/contracts/funding-pool.ts";

const key = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex;
if (!key) throw new Error("no deployer key");

async function main() {
  const wallet = getWalletClient(key);
  const operator = wallet.account!.address;
  console.log(`Deploying FundingPool to ${arcConfig.explorerName} · operator ${operator}`);
  const hash = await wallet.deployContract({
    abi: fundingPoolAbi as never,
    bytecode: fundingPoolBytecode as Hex,
    args: [arcConfig.usdcToken, operator] as never,
    account: wallet.account!,
    chain: wallet.chain,
  });
  const rcpt = await getClient().waitForTransactionReceipt({ hash });
  const address = rcpt.contractAddress!;
  console.log(`  FundingPool: ${address}`);
  console.log(`    deploy tx: ${explorerTxUrl(hash)}`);
  console.log(`    address:   ${explorerAddressUrl(address)}`);

  const path = join(dirname(fileURLToPath(import.meta.url)), "../src/contracts/deployed.json");
  const d = JSON.parse(readFileSync(path, "utf8"));
  d.fundingPool = { address, tx: hash };
  writeFileSync(path, JSON.stringify(d, null, 2) + "\n");
  console.log(`  merged into deployed.json`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
