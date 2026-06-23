/**
 * @sluice/chain — the SINGLE source of truth for chain config (CLAUDE.md #3).
 * No RPC URL, chain id, or contract address may be hardcoded anywhere else.
 * Swapping RPC provider — or, last resort, the whole network — is a config change here.
 *
 * Verified Arc-testnet constants (confirmed against circlefin/arc-nanopayments, June 2026).
 */

import type { Address } from "viem";

// Built-in defaults so the app works with zero env config (these are public constants).
const DEFAULTS = {
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  explorerName: "Arcscan",
  usdcToken: "0x3600000000000000000000000000000000000000" as Address,
  gatewayWallet: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as Address,
  gatewayDomain: 26,
  gatewayApiUrl: "https://gateway-api-testnet.circle.com",
} as const;

function pick(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

/** Parse a comma-separated list of RPC URLs (server-only fallbacks). */
function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// NOTE: references to process.env.NEXT_PUBLIC_* must be LITERAL so Next can inline them
// into the browser bundle. Server-only vars (no NEXT_PUBLIC_) are simply undefined in the browser.
const chainId = Number.parseInt(
  pick(process.env.NEXT_PUBLIC_ARC_CHAIN_ID, String(DEFAULTS.chainId)),
  10,
);
const rpcUrl = pick(process.env.NEXT_PUBLIC_ARC_RPC_URL, DEFAULTS.rpcUrl);
const explorerUrl = pick(process.env.NEXT_PUBLIC_ARC_EXPLORER_URL, DEFAULTS.explorerUrl);

// Optional server-only ordered backup RPCs (Arc stays primary, quiet).
const alchemyKey = process.env.ALCHEMY_ARC_KEY;
const rpcFallbacks = [
  ...parseList(process.env.ARC_RPC_FALLBACKS),
  ...(alchemyKey ? [`https://arc-testnet.g.alchemy.com/v2/${alchemyKey}`] : []),
].filter((u) => u !== rpcUrl);

export interface ArcConfig {
  readonly chainId: number;
  /** CAIP-2 network id, e.g. "eip155:5042002" (x402 uses this). */
  readonly caip2: `eip155:${number}`;
  readonly rpcUrl: string;
  /** Ordered backup RPCs (same chain). Empty in the browser by design. */
  readonly rpcFallbacks: readonly string[];
  readonly explorerUrl: string;
  readonly explorerName: string;
  readonly nativeSymbol: string;
  readonly nativeDecimals: number;
  /** ERC-20 USDC token (payments, 6 decimals). */
  readonly usdcToken: Address;
  /** Gateway Wallet contract (EIP-3009 verifyingContract). */
  readonly gatewayWallet: Address;
  /** Circle "domain" id for Arc testnet (Gateway/CCTP). */
  readonly gatewayDomain: number;
  readonly gatewayApiUrl: string;
  readonly isTestnet: boolean;
}

export const arcConfig: ArcConfig = {
  chainId,
  caip2: `eip155:${chainId}`,
  rpcUrl,
  rpcFallbacks,
  explorerUrl,
  explorerName: DEFAULTS.explorerName,
  // Arc's native gas token is USDC, displayed with 18 decimals (CLAUDE.md #5).
  nativeSymbol: "USDC",
  nativeDecimals: 18,
  usdcToken: pick(process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS, DEFAULTS.usdcToken) as Address,
  gatewayWallet: pick(
    process.env.NEXT_PUBLIC_GATEWAY_WALLET_ADDRESS,
    DEFAULTS.gatewayWallet,
  ) as Address,
  gatewayDomain: Number.parseInt(
    pick(process.env.NEXT_PUBLIC_ARC_GATEWAY_DOMAIN, String(DEFAULTS.gatewayDomain)),
    10,
  ),
  gatewayApiUrl: pick(process.env.GATEWAY_API_URL, DEFAULTS.gatewayApiUrl),
  isTestnet: true,
};

// ── Explorer link helpers (always link tx/receipts here — "don't trust, verify") ──
export function explorerTxUrl(txHash: string): string {
  return `${arcConfig.explorerUrl}/tx/${txHash}`;
}
export function explorerAddressUrl(address: string): string {
  return `${arcConfig.explorerUrl}/address/${address}`;
}
