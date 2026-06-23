/**
 * Shared, SSR-safe wagmi + Reown AppKit config.
 *
 * This module is imported by BOTH the server (to compute cookie initial state) and the client.
 * It must NOT call createAppKit (that lives in the "use client" providers, guarded by projectId)
 * and must NOT touch window. Chain config comes from @sluice/chain (the single source).
 */
import { cookieStorage, createStorage } from "wagmi";
import { http } from "viem";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain, type AppKitNetwork } from "@reown/appkit/networks";
import { arcConfig } from "@sluice/chain";

/** Free WalletConnect/Reown project id (https://cloud.reown.com). Empty → email/social disabled. */
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";
export const hasProjectId = projectId.length > 0;

/** Arc Testnet as a Reown CaipNetwork, mirrored from the single chain config. */
export const arcAppKitNetwork = defineChain({
  id: arcConfig.chainId,
  caipNetworkId: `eip155:${arcConfig.chainId}`,
  chainNamespace: "eip155",
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: arcConfig.nativeSymbol, decimals: arcConfig.nativeDecimals },
  rpcUrls: { default: { http: [arcConfig.rpcUrl, ...arcConfig.rpcFallbacks] } },
  blockExplorers: {
    default: { name: arcConfig.explorerName, url: arcConfig.explorerUrl },
  },
  testnet: true,
});

export const appKitNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [arcAppKitNetwork];

export const appMetadata = {
  name: "Sluice",
  description: "The settlement layer for the agent-paid web.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  icons: ["/icon.svg"],
};

/**
 * The wagmi adapter. `ssr: true` + cookieStorage make wagmi hydration-safe in the App Router.
 * A projectId is NOT required to construct this — injected (browser) wallets still work without it.
 */
export const wagmiAdapter = new WagmiAdapter({
  networks: appKitNetworks,
  projectId,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [arcConfig.chainId]: http(arcConfig.rpcUrl),
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
