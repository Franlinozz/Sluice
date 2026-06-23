"use client";

import * as React from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "../cn.ts";

function truncate(value: string, chars: number): string {
  if (value.length <= chars * 2 + 2) return value;
  return `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
}

export interface AddressChipProps {
  address: string;
  /** Characters to show on each side (default 4). */
  chars?: number;
  /** Explorer URL — renders an external-link affordance when provided. */
  href?: string;
  className?: string;
}

/** Monospace address with copy + optional explorer link. */
export function AddressChip({ address, chars = 4, href, className }: AddressChipProps) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable — silently no-op (chip still shows the address) */
    }
  }, [address]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface-2 py-1 pl-2.5 pr-1.5 font-mono text-xs text-hi",
        className,
      )}
    >
      <span className="tnum">{truncate(address, chars)}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy address"}
        className="grid size-6 place-items-center rounded text-mid transition-colors hover:bg-surface-3 hover:text-hi"
      >
        {copied ? <Check className="size-3.5 text-settled" /> : <Copy className="size-3.5" />}
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label="View on explorer"
          className="grid size-6 place-items-center rounded text-mid transition-colors hover:bg-surface-3 hover:text-hi"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </span>
  );
}
