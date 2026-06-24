/**
 * Read-only chain access. Uses viem's `fallback` transport so a flaky fresh testnet
 * degrades gracefully: Arc primary first, then ordered backups, with retry/backoff
 * (CLAUDE.md #3 + anticipated bugs · Arc). This client is for SERVER/agent contexts;
 * the browser reads through wagmi's configured transport.
 */
import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  erc20Abi,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcConfig } from "./config.ts";
import { arcTestnet } from "./chain.ts";

let cached: PublicClient | undefined;

export function createArcPublicClient(): PublicClient {
  const urls = [arcConfig.rpcUrl, ...arcConfig.rpcFallbacks];
  const transports = urls.map((url) =>
    http(url, { retryCount: 3, retryDelay: 300, timeout: 10_000 }),
  );
  return createPublicClient({
    chain: arcTestnet,
    // rank:false → strict priority order, keeping Arc primary and quiet.
    transport: transports.length > 1 ? fallback(transports, { rank: false }) : transports[0]!,
  });
}

/** Shared singleton public client (server/agent use). */
export function arcPublicClient(): PublicClient {
  return (cached ??= createArcPublicClient());
}

/** Convenience alias — the canonical read client for Arc. */
export function getClient(): PublicClient {
  return arcPublicClient();
}

/** A viem wallet client bound to a private key, for direct on-chain ops on Arc. */
export function getWalletClient(privateKey: Hex): WalletClient {
  const account: Account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(arcConfig.rpcUrl, { retryCount: 3, retryDelay: 300, timeout: 10_000 }),
  });
}

/**
 * Native gas balance (Arc native USDC, 18-dp base units). For DISPLAY use @sluice/money's
 * formatNative — never mix with 6-dp payment USDC.
 */
export async function getNativeBalance(address: Address): Promise<bigint> {
  return arcPublicClient().getBalance({ address });
}

/** ERC-20 USDC balance (payments, 6-dp base units). Format with @sluice/money formatUSDC. */
export async function getUsdcBalance(address: Address): Promise<bigint> {
  return arcPublicClient().readContract({
    address: arcConfig.usdcToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
}

export { erc20Abi };
