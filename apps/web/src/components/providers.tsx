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
  createAppKit({
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
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 2 },
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
