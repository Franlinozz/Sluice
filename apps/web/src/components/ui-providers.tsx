"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@sluice/ui";

/**
 * Lightweight UI context for EVERY page (toasts + tooltips). The heavy wallet stack
 * (wagmi + Reown AppKit) lives in Providers and is mounted ONLY under /app — marketing
 * pages ship without it (R3 perf: it was most of the landing's main-thread cost).
 */
export function UiProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface-2)",
            color: "var(--text-hi)",
            border: "1px solid var(--border-emphasis)",
          },
        }}
      />
    </TooltipProvider>
  );
}
