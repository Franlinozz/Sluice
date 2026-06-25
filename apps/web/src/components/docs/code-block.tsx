"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@sluice/ui";

/** A copy-able code block in the Graphite terminal style. */
export function CodeBlock({ code, lang, className }: { code: string; lang?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <div className={cn("group relative my-4 overflow-hidden rounded-card border border-hairline bg-terminal", className)}>
      {lang && (
        <div className="flex items-center justify-between border-b border-hairline px-4 py-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-low">{lang}</span>
        </div>
      )}
      <button
        onClick={copy}
        aria-label="Copy code"
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-md border border-hairline bg-surface-2 text-mid opacity-0 transition-opacity hover:text-hi group-hover:opacity-100"
      >
        {copied ? <Check className="size-3.5 text-settled" /> : <Copy className="size-3.5" />}
      </button>
      <pre className="overflow-x-auto px-4 py-3.5">
        <code className="font-mono text-[13px] leading-relaxed text-mid">{code}</code>
      </pre>
    </div>
  );
}
