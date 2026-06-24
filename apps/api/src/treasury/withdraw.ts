/**
 * Treasury withdrawals (Phase 5). Materializes Gateway earnings on-chain via the Gateway Minter.
 * Same-chain (Arc) is an instant mint — gas paid in Arc native USDC. Cross-chain burns on Circle's
 * attested ledger (gas-free) then submits gatewayMint on the DESTINATION chain, which needs native
 * gas there. We PRE-FLIGHT the destination gas and refuse before signing the burn, so a withdrawal
 * can never strand funds (burned but not minted). Every result is a real, explorer-linkable tx.
 */
import { createPublicClient, http, parseEther, type Address, type Hex } from "viem";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { getWalletClient, getNativeBalance, getClient } from "@sluice/chain";

export interface WithdrawChain {
  name: string; // GatewayClient SupportedChainName
  label: string;
  rpc: string;
  explorerTx: string; // base, append tx hash
  sameChain: boolean; // true for Arc (instant, no destination gas needed)
}

export const WITHDRAW_CHAINS: WithdrawChain[] = [
  {
    name: "arcTestnet",
    label: "Arc (instant)",
    rpc: process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.arc-sepolia.gelato.digital",
    explorerTx: "https://testnet.arcscan.app/tx/",
    sameChain: true,
  },
  { name: "baseSepolia", label: "Base Sepolia", rpc: "https://sepolia.base.org", explorerTx: "https://sepolia.basescan.org/tx/", sameChain: false },
  { name: "arbitrumSepolia", label: "Arbitrum Sepolia", rpc: "https://sepolia-rollup.arbitrum.io/rpc", explorerTx: "https://sepolia.arbiscan.io/tx/", sameChain: false },
  { name: "ethereumSepolia", label: "Ethereum Sepolia", rpc: "https://ethereum-sepolia-rpc.publicnode.com", explorerTx: "https://sepolia.etherscan.io/tx/", sameChain: false },
];

function chainByName(name: string): WithdrawChain | undefined {
  return WITHDRAW_CHAINS.find((c) => c.name === name);
}

function treasuryKey(): Hex {
  // The Treasury is the platform/operator wallet — it holds the unified Gateway balance and, for
  // cross-chain withdrawals, submits the destination mint (so it must hold the destination gas).
  const k = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY ?? process.env.SELLER_PRIVATE_KEY) as
    | Hex
    | undefined;
  if (!k) throw new Error("no treasury key");
  return k;
}

export function treasuryAddress(): Address {
  return getWalletClient(treasuryKey()).account!.address;
}

export interface WithdrawResultView {
  mintTxHash: string;
  sourceChain: string;
  destinationChain: string;
  formattedAmount: string;
  recipient: string;
  explorerUrl: string;
  instant: boolean;
}

export async function withdrawTreasury(params: {
  amount: string;
  chain: string;
  recipient?: string;
}): Promise<WithdrawResultView> {
  const chain = chainByName(params.chain);
  if (!chain) throw new Error(`unsupported chain: ${params.chain}`);
  const amountNum = Number(params.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) throw new Error("amount must be > 0");

  const key = treasuryKey();
  const client = new GatewayClient({ chain: "arcTestnet", privateKey: key });
  const recipient = (params.recipient as Address) || client.address;

  const balances = await client.getBalances();
  if (balances.gateway.available < BigInt(Math.round(amountNum * 1e6))) {
    throw new Error(`insufficient available balance (have ${balances.gateway.formattedAvailable} USDC)`);
  }

  if (chain.sameChain) {
    // Instant mint on Arc — ensure the treasury wallet has native gas (top up from operator if short).
    await ensureArcGas(client.address);
  } else {
    // Cross-chain: the destination mint needs native gas on that chain. Pre-flight BEFORE burning.
    const dest = createPublicClient({ transport: http(chain.rpc, { timeout: 10_000 }) });
    const gas = await dest.getBalance({ address: recipient }).catch(() => 0n);
    if (gas === 0n) {
      throw new Error(
        `${chain.label} mint needs native gas on the recipient (${recipient}). Fund a little ${chain.label} gas, then retry — no funds were moved.`,
      );
    }
  }

  const res = await client.withdraw(params.amount, {
    chain: chain.name as never,
    recipient,
    maxFee: "0.05",
  });

  return {
    mintTxHash: res.mintTxHash,
    sourceChain: res.sourceChain,
    destinationChain: res.destinationChain,
    formattedAmount: res.formattedAmount,
    recipient: res.recipient,
    explorerUrl: `${chain.explorerTx}${res.mintTxHash}`,
    instant: chain.sameChain,
  };
}

/** Top up the treasury wallet's Arc native gas from the operator if it's running low. */
async function ensureArcGas(addr: Address): Promise<void> {
  const have = await getNativeBalance(addr);
  const floor = parseEther("0.05");
  if (have >= floor) return;
  const opKey = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex | undefined;
  if (!opKey) return;
  const op = getWalletClient(opKey);
  if (op.account!.address.toLowerCase() === addr.toLowerCase()) return;
  const hash = await op.sendTransaction({ to: addr, value: floor - have, account: op.account!, chain: op.chain } as never);
  await getClient().waitForTransactionReceipt({ hash });
}
