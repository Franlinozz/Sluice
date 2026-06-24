import "../src/env.ts";
import { CHAIN_CONFIGS } from "@circle-fin/x402-batching/client";
import { getClient, explorerTxUrl } from "@sluice/chain";

const cfg = CHAIN_CONFIGS.arcTestnet;
console.log("arcTestnet chain config:");
console.log(JSON.stringify({ domain: cfg.domain, usdc: cfg.usdc, gatewayWallet: cfg.gatewayWallet, gatewayMinter: cfg.gatewayMinter, rpcUrl: cfg.rpcUrl }, null, 2));

const seller = "0x303c819cbb4d7481721e5310E2b120C2a2cdfC58".toLowerCase().replace("0x", "");
const client = getClient();

async function scan(label: string, address: `0x${string}`) {
  const latest = await client.getBlockNumber();
  const start = latest - 6000n;
  const txs = new Set<string>();
  for (let from = start; from <= latest; from += 2001n) {
    const to = from + 2000n > latest ? latest : from + 2000n;
    try {
      const logs = await client.getLogs({ address, fromBlock: from, toBlock: to });
      for (const log of logs) {
        const blobs = [...(log.topics ?? []), log.data ?? "0x"].join("").toLowerCase();
        if (blobs.includes(seller) && log.transactionHash) txs.add(log.transactionHash);
      }
    } catch (e) {
      /* range error, skip */
    }
  }
  console.log(`\n${label} (${address}) — txs referencing seller: ${txs.size}`);
  for (const t of txs) console.log("  " + explorerTxUrl(t));
}

async function main() {
  await scan("USDC token", cfg.usdc);
  await scan("Gateway Minter", cfg.gatewayMinter);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
