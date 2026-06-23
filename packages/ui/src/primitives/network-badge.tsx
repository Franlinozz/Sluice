import * as React from "react";
import { cn } from "../cn.ts";

export type LiveStatus = "live" | "connecting" | "down";

const STATUS_VAR: Record<LiveStatus, string> = {
  live: "--live",
  connecting: "--pending",
  down: "--failed",
};

const STATUS_LABEL: Record<LiveStatus, string> = {
  live: "Live",
  connecting: "Connecting",
  down: "Offline",
};

/** A status dot with an optional animated ping ring (live only). */
export function LiveDot({ status, className }: { status: LiveStatus; className?: string }) {
  const color = `var(${STATUS_VAR[status]})`;
  return (
    <span className={cn("relative inline-flex size-2 items-center justify-center", className)}>
      {status === "live" && (
        <span
          aria-hidden
          className="absolute inline-flex size-2 animate-ping rounded-full opacity-60"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        aria-hidden
        className="relative inline-flex size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

export interface NetworkBadgeProps {
  /** Network label, e.g. "Arc Testnet". */
  name: string;
  status: LiveStatus;
  className?: string;
}

/** The chain "Live" badge for the top utility bar. Status must reflect REAL connectivity. */
export function NetworkBadge({ name, status, className }: NetworkBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border border-edge bg-surface-2 py-1 pl-2.5 pr-3 text-xs text-mid",
        className,
      )}
    >
      <LiveDot status={status} />
      <span className="font-medium text-hi">{name}</span>
      <span className="text-low">·</span>
      <span style={{ color: `var(${STATUS_VAR[status]})` }} className="font-medium">
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}
