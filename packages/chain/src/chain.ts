/**
 * viem chain definition for Arc Testnet, built from the single arcConfig.
 * NOTE: do NOT assert on the native symbol elsewhere — some wallets mislabel it "ETH".
 * Always assert on chainId (CLAUDE.md anticipated bugs · Arc).
 */
import { defineChain } from "viem";
import { arcConfig } from "./config.ts";

export const arcTestnet = defineChain({
  id: arcConfig.chainId,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USD Coin",
    symbol: arcConfig.nativeSymbol, // "USDC" — Arc's native gas token (18-dp display)
    decimals: arcConfig.nativeDecimals,
  },
  rpcUrls: {
    default: {
      http: [arcConfig.rpcUrl, ...arcConfig.rpcFallbacks],
    },
  },
  blockExplorers: {
    default: {
      name: arcConfig.explorerName,
      url: arcConfig.explorerUrl,
    },
  },
  testnet: arcConfig.isTestnet,
});

/** The chain(s) this app supports. Add a fallback network here, not in scattered code. */
export const supportedChains = [arcTestnet] as const;
