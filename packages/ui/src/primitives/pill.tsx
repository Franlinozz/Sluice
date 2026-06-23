import * as React from "react";
import { cn } from "../cn.ts";

/** The locked, global settlement states (CLAUDE.md #8). */
export type SettlementStatus = "settled" | "batching" | "authorized" | "failed";

/** Any tone that maps to a semantic token. */
export type PillTone = "settled" | "pending" | "failed" | "info" | "neutral";

const STATUS_TO_TONE: Record<SettlementStatus, PillTone> = {
  settled: "settled",
  batching: "pending",
  authorized: "info",
  failed: "failed",
};

const STATUS_LABEL: Record<SettlementStatus, string> = {
  authorized: "Authorized",
  batching: "Batching",
  settled: "Settled",
  failed: "Failed",
};

const TONE_VAR: Record<Exclude<PillTone, "neutral">, string> = {
  settled: "--settled",
  pending: "--pending",
  failed: "--failed",
  info: "--info",
};

function toneStyle(tone: PillTone): React.CSSProperties {
  if (tone === "neutral") {
    return {
      backgroundColor: "var(--surface-3)",
      borderColor: "var(--border-emphasis)",
      color: "var(--text-mid)",
    };
  }
  const v = TONE_VAR[tone];
  // 14% bg / full-opacity text / 30% border (locked spec).
  return {
    backgroundColor: `color-mix(in srgb, var(${v}) 14%, transparent)`,
    borderColor: `color-mix(in srgb, var(${v}) 30%, transparent)`,
    color: `var(${v})`,
  };
}

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  /** Show a leading status dot. */
  dot?: boolean;
}

/** Generic semantic pill. */
export function Pill({ tone = "neutral", dot = false, className, children, ...props }: PillProps) {
  return (
    <span
      style={toneStyle(tone)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-medium leading-5",
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ backgroundColor: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}

/** Settlement-state pill with the canonical label + tone. */
export function StatusPill({
  status,
  className,
  withDot = true,
}: {
  status: SettlementStatus;
  className?: string;
  withDot?: boolean;
}) {
  return (
    <Pill tone={STATUS_TO_TONE[status]} dot={withDot} className={className}>
      {STATUS_LABEL[status]}
    </Pill>
  );
}
