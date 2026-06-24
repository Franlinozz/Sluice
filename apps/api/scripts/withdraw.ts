/** Seller withdrawal — materializes settled Gateway earnings on-chain (Gateway Minter mint tx). */
import "../src/env.ts";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { parseEther } from "viem";
import { getNativeBalance, getClient, getWalletClient, explorerTxUrl } from "@sluice/chain";

const sellerPk = process.env.SELLER_PRIVATE_KEY as `0x${string}`;
const buyerPk = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as `0x${string}`;

async function main() {
  const seller = new GatewayClient({ chain: "arcTestnet", privateKey: sellerPk });
  const bal = await seller.getBalances();
  console.log(`Seller: ${seller.address}`);
  console.log(`Gateway available: ${bal.gateway.formattedAvailable} USDC`);
  if (bal.gateway.available === 0n) {
    console.log("Nothing to withdraw.");
    return;
  }

  // Fund the seller with native gas (Arc gas = native USDC, 18dp) if needed.
  const sellerGas = await getNativeBalance(seller.address);
  const need = parseEther("0.05");
  if (sellerGas < need) {
    console.log("Funding seller gas from buyer…");
    const buyerWallet = getWalletClient(buyerPk);
    const hash = await buyerWallet.sendTransaction({ to: seller.address, value: need } as never);
    await getClient().waitForTransactionReceipt({ hash });
    console.log(`  gas funded: ${hash}`);
  }

  // Withdraw to the same chain (instant mint). Leave headroom for Circle's ~0.0035 USDC fee.
  const FEE_BUFFER = 4000n; // 0.004 USDC
  const avail = bal.gateway.available;
  const want = process.env.WITHDRAW_AMOUNT
    ? bal.gateway.formattedAvailable // explicit override below
    : null;
  const amountBase = avail > FEE_BUFFER ? avail - FEE_BUFFER : 0n;
  const amount = process.env.WITHDRAW_AMOUNT ?? (Number(amountBase) / 1e6).toFixed(6);
  void want;
  if (Number(amount) <= 0) {
    console.log("Balance too low to cover the withdrawal fee (~0.0035 USDC). Accrue more first.");
    return;
  }
  console.log(`Withdrawing ${amount} USDC (same-chain instant mint)…`);
  try {
    const res = await seller.withdraw(amount, { maxFee: "0.01" });
    console.log(`  mint tx: ${res.mintTxHash}`);
    console.log(`  explorer: ${explorerTxUrl(res.mintTxHash)}`);
    console.log(`  amount: ${res.formattedAmount} → ${res.recipient}`);
  } catch (err) {
    console.error(`  withdraw failed: ${err instanceof Error ? err.message : err}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
