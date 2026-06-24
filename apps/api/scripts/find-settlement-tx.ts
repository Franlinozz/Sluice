/** Scan the Gateway Wallet contract's recent logs for our payer/payee to find the on-chain
 *  batch settlement tx hash (Circle's transfer API doesn't expose it). */
import "../src/env.ts";
import { getClient, arcConfig, explorerTxUrl } from "@sluice/chain";

const targets = [
  "0x303c819cbb4d7481721e5310E2b120C2a2cdfC58", // seller
  "0xBd88eAE165F8A00B1B33357Fb0880CD4fE5C5E70", // buyer
].map((a) => a.toLowerCase().replace("0x", ""));

const client = getClient();

function mentions(hexBlobs: string[]): string | undefined {
  for (const t of targets) {
    if (hexBlobs.some((h) => h.toLowerCase().includes(t))) return t;
  }
  return undefined;
}

async function main() {
  const latest = await client.getBlockNumber();
  const span = 12000n;
  const chunk = 2000n;
  const start = latest > span ? latest - span : 0n;
  console.log(`Gateway Wallet: ${arcConfig.gatewayWallet}`);
  console.log(`Scanning blocks ${start}..${latest} for our addresses…`);
  const found = new Map<string, { block: bigint; who: string }>();

  for (let from = start; from <= latest; from += chunk + 1n) {
    const to = from + chunk > latest ? latest : from + chunk;
    let logs;
    try {
      logs = await client.getLogs({ address: arcConfig.gatewayWallet, fromBlock: from, toBlock: to });
    } catch (e) {
      console.log(`  [${from}-${to}] getLogs error: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    for (const log of logs) {
      const blobs = [...(log.topics ?? []), log.data ?? "0x"];
      const who = mentions(blobs);
      if (who && log.transactionHash) {
        if (!found.has(log.transactionHash)) {
          found.set(log.transactionHash, { block: log.blockNumber ?? 0n, who });
        }
      }
    }
  }

  if (found.size === 0) {
    console.log("No matching settlement logs found in range.");
    return;
  }
  console.log(`\nFound ${found.size} settlement tx(s) referencing our addresses:`);
  for (const [tx, meta] of found) {
    console.log(`  ${tx}  (block ${meta.block}, matched ${meta.who.slice(0, 8)})`);
    console.log(`    ${explorerTxUrl(tx)}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
