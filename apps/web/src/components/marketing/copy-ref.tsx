"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

/** Copy-able settlement reference (the Circle Gateway transfer ID anyone can re-check). */
export function CopyRef({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        })
      }
      className="group inline-flex max-w-full items-center gap-2 rounded-[8px] border border-hairline bg-surface-2/60 px-2 py-1 text-left transition-colors hover:border-edge"
      aria-label="Copy transfer ID"
      title="Copy transfer ID"
    >
      <span className="truncate font-mono text-xs text-mid">{value}</span>
      {copied ? (
        <Check className="size-3 shrink-0" style={{ color: "var(--settled)" }} />
      ) : (
        <Copy className="size-3 shrink-0 text-low group-hover:text-mid" />
      )}
    </button>
  );
}
