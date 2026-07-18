"use client";

import * as React from "react";
import { WagmiProvider, type State } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import {
  appKitNetworks,
  appMetadata,
  hasProjectId,
  projectId,
  wagmiAdapter,
  wagmiConfig,
} from "@/lib/wagmi";

// Initialise the Reown AppKit modal exactly once, at module scope, when a projectId exists.
// createAppKit is SSR-safe and MUST run during SSR too — components call useAppKit() while
// server-rendering, which throws if createAppKit hasn't run (Vercel 500). Do NOT guard on
// `typeof window`. When there's no projectId, the wallet UI takes the injected-only path
// (no useAppKit), so this stays unset and nothing throws.
if (hasProjectId) {
  const modal = createAppKit({
    adapters: [wagmiAdapter],
    networks: appKitNetworks,
    defaultNetwork: appKitNetworks[0],
    projectId,
    metadata: appMetadata,
    themeMode: "dark",
    features: {
      analytics: false,
      email: true,
      socials: ["google", "github", "x", "apple", "discord"],
      emailShowWallets: true,
    },
    themeVariables: {
      "--w3m-accent": "#e8eaed",
      "--w3m-border-radius-master": "2px",
      "--w3m-font-family": "var(--ff-sans), system-ui, sans-serif",
    },
  });

  // Capture the REAL sign-in medium so profiles can honestly show it (Google/X/Discord/etc.).
  // embeddedWalletInfo.authProvider is present for email/social logins; undefined for external
  // wallets (MetaMask etc.) → recorded as "wallet". Stashed for use-profile's ensure() call.
  modal.subscribeAccount((acc) => {
    if (typeof window === "undefined" || !acc?.isConnected) return;
    const provider = acc.embeddedWalletInfo?.authProvider ?? "wallet";
    try {
      window.localStorage.setItem("sluice-auth-provider", provider);
    } catch {
      /* private mode / storage disabled — capture is best-effort, never blocks sign-in */
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    // staleTime 30s (hotfix 2026-07-18): chain-backed reads must not refetch more than ~2×/min.
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 2 },
  },
});

export function Providers({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State;
}) {
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
