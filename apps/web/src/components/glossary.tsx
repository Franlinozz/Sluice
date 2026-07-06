"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@sluice/ui";

/**
 * Glossary tooltips (R4 plain-language pass): the first use of a term of art on a page gets a
 * dotted underline; hover/tap/focus shows a two-line plain-English explanation. Keyboard
 * accessible — the trigger is tabbable and Radix handles focus/escape.
 */
const DEFINITIONS: Record<string, { title: string; plain: string }> = {
  gateway: {
    title: "Circle Gateway",
    plain:
      "Circle's settlement service. It bundles many tiny USDC payments and settles them together, so nobody pays gas per payment.",
  },
  x402: {
    title: "x402",
    plain:
      'An open web standard for paying per request: a server replies "402 Payment Required", the buyer pays, then gets the content.',
  },
  "citation-toll": {
    title: "Citation toll",
    plain:
      "When an AI cites a source, it pays that source's author a tiny amount. The payment and the citation are the same event.",
  },
  bond: {
    title: "Reputation bond",
    plain:
      "Money a provider locks up as a promise to deliver. Deliver → they get it back. Fail → it goes to the buyer.",
  },
  "eip-3009": {
    title: "EIP-3009",
    plain:
      "A signed permission slip for USDC: you authorize an amount once, and it can settle later without another signature.",
  },
  "batch-settlement": {
    title: "Batch settlement",
    plain:
      "Many small payments are grouped and settled as one, so fees don't eat micro-payments.",
  },
  "proof-of-flow": {
    title: "Proof of flow",
    plain:
      "A heartbeat that proves a stream is actually being delivered. If it stops, billing stops — no charge for dead air.",
  },
};

export function Term({ k, children }: { k: keyof typeof DEFINITIONS | string; children: React.ReactNode }) {
  const def = DEFINITIONS[k];
  if (!def) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-help rounded-sm underline decoration-dotted decoration-[var(--text-low)] underline-offset-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-steel"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px]">
        <span className="block text-xs font-medium text-hi">{def.title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-mid">{def.plain}</span>
      </TooltipContent>
    </Tooltip>
  );
}
