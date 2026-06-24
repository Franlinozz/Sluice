/**
 * Deploy the Phase 5 contracts to Arc testnet: ERC-8004 IdentityRegistry + ReputationRegistry and
 * the BondEscrow (reputation = capital at risk). Writes the addresses + deploy txs to
 * apps/api/src/contracts/deployed.json (committed; addresses are public). Real on-chain deploys.
 */
import "../src/env.ts";
import { type Hex } from "viem";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { arcConfig, getClient, getWalletClient, explorerAddressUrl, explorerTxUrl } from "@sluice/chain";
import { identityRegistryAbi, identityRegistryBytecode } from "../src/contracts/identity-registry.ts";
import { reputationRegistryAbi, reputationRegistryBytecode } from "../src/contracts/reputation-registry.ts";
import { bondEscrowAbi, bondEscrowBytecode } from "../src/contracts/bond-escrow.ts";

const deployerKey = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex;
if (!deployerKey) throw new Error("no deployer key (BUYER_PRIVATE_KEY)");

async function deploy(label: string, abi: unknown, bytecode: Hex, args: unknown[]) {
  const wallet = getWalletClient(deployerKey);
  const account = wallet.account!;
  const hash = await wallet.deployContract({
    abi: abi as never,
    bytecode,
    args: args as never,
    account,
    chain: wallet.chain,
  });
  const rcpt = await getClient().waitForTransactionReceipt({ hash });
  if (!rcpt.contractAddress) throw new Error(`${label}: no contract address`);
  console.log(`  ${label}: ${rcpt.contractAddress}`);
  console.log(`    deploy tx: ${explorerTxUrl(hash)}`);
  console.log(`    address:   ${explorerAddressUrl(rcpt.contractAddress)}`);
  return { address: rcpt.contractAddress, tx: hash };
}

async function main() {
  const arbiter = getWalletClient(deployerKey).account!.address;
  console.log(`Deploying Phase 5 contracts to ${arcConfig.explorerName} (chain ${arcConfig.chainId})`);
  console.log(`Deployer / arbiter: ${arbiter}\n`);

  const identity = await deploy("IdentityRegistry", identityRegistryAbi, identityRegistryBytecode as Hex, []);
  const reputation = await deploy(
    "ReputationRegistry",
    reputationRegistryAbi,
    reputationRegistryBytecode as Hex,
    [identity.address],
  );
  const escrow = await deploy("BondEscrow", bondEscrowAbi, bondEscrowBytecode as Hex, [
    arcConfig.usdcToken,
    arbiter,
  ]);

  const out = {
    chainId: arcConfig.chainId,
    explorer: arcConfig.explorerUrl,
    deployer: arbiter,
    arbiter,
    usdcToken: arcConfig.usdcToken,
    deployedAt: new Date().toISOString(),
    identityRegistry: { address: identity.address, tx: identity.tx },
    reputationRegistry: { address: reputation.address, tx: reputation.tx },
    bondEscrow: { address: escrow.address, tx: escrow.tx },
  };
  const dest = join(dirname(fileURLToPath(import.meta.url)), "../src/contracts/deployed.json");
  writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${dest}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
