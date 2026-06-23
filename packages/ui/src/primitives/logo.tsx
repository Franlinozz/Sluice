import * as React from "react";
import { cn } from "../cn.ts";

/**
 * Sluice mark — metered flow lines passing through a gate, emerging as a single
 * settled drop (the signal accent). Structure uses currentColor; the drop uses --signal.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Sluice"
      className={cn("size-6 text-hi", className)}
    >
      <path d="M4 8h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path d="M3 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M4 16h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path d="M14 4.5v15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="19" cy="12" r="1.9" fill="var(--signal)" />
    </svg>
  );
}

export function Logo({
  withWordmark = true,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {withWordmark && (
        <span className="font-display text-[17px] font-semibold tracking-tight text-hi">
          Sluice
        </span>
      )}
    </span>
  );
}
