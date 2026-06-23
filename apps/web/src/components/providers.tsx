"use client";

import * as React from "react";
import { WagmiProvider, type State } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@sluice/ui";
import {
  appKitNetworks,
  appMetadata,
  hasProjectId,
  projectId,
  wagmiAdapter,
  wagmiConfig,
} from "@/lib/wagmi";

// Initialise the Reown AppKit modal exactly once, on the client, and only when a projectId
// exists (CLAUDE.md: missing projectId → modal silently fails; we guard instead). Without it,
// injected (browser) wallets still work through wagmi; email/social light up once it's set.
if (hasProjectId && typeof window !== "undefined") {
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
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200} skipDelayDuration={300}>
          {children}
        </TooltipProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface-2)",
              color: "var(--text-hi)",
              border: "1px solid var(--border-emphasis)",
              borderRadius: "10px",
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
