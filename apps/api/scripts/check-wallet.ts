/**
 * Crosscheck a wallet: derive its address from ARC_WALLET_PRIVATE_KEY, confirm it matches
 * ARC_WALLET_ADDRESS, and read its REAL on-chain balances on Arc testnet.
 *
 * Run: set -a && . /root/.sluice-secrets/sluice.env && set +a && \
 *      pnpm --filter @sluice/api exec tsx scripts/check-wallet.ts
 */
import { privateKeyToAccount } from "viem/accounts";
import { arcConfig, explorerAddressUrl, getNativeBalance, getUsdcBalance } from "@sluice/chain";
import { formatNative, formatUSDC } from "@sluice/money";

const pk = process.env.ARC_WALLET_PRIVATE_KEY as `0x${string}` | undefined;
const expected = process.env.ARC_WALLET_ADDRESS;

if (!pk) {
  console.error("ARC_WALLET_PRIVATE_KEY not set");
  process.exit(1);
}

const account = privateKeyToAccount(pk);
const match = expected ? account.address.toLowerCase() === expected.toLowerCase() : null;

console.log("— Wallet derivation —");
console.log("  derived address :", account.address);
console.log("  expected address:", expected ?? "(none provided)");
console.log("  match           :", match === null ? "(no expected to compare)" : match ? "✅ YES" : "❌ NO");

console.log("\n— On-chain balances (live Arc testnet) —");
console.log("  chain:", arcConfig.caip2, "· rpc:", arcConfig.rpcUrl);
try {
  const [usdc, native] = await Promise.all([
    getUsdcBalance(account.address),
    getNativeBalance(account.address),
  ]);
  console.log(`  USDC (ERC-20, 6dp): ${formatUSDC(usdc)} USDC  [${usdc.toString()} base units]`);
  console.log(`  native gas (18dp) : ${formatNative(native)} USDC`);
} catch (err) {
  console.error("  balance read failed:", err instanceof Error ? err.message : err);
}
console.log("\n  explorer:", explorerAddressUrl(account.address));
