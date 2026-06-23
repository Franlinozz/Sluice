import * as React from "react";
import { cn } from "../cn.ts";

export interface DataRowProps {
  label: React.ReactNode;
  children: React.ReactNode;
  /** Render the value in tabular mono (amounts, hashes, ids). */
  mono?: boolean;
  className?: string;
}

/** A label/value row with a hairline divider — the workhorse of detail panels. */
export function DataRow({ label, children, mono, className }: DataRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0",
        className,
      )}
    >
      <span className="text-sm text-mid">{label}</span>
      <span className={cn("text-right text-sm text-hi", mono && "font-mono tnum")}>{children}</span>
    </div>
  );
}
