import * as React from "react";
import { cn } from "../cn.ts";

const SIZE: Record<string, string> = {
  xs: "text-[11px]",
  sm: "text-[13px]",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-2xl",
  "2xl": "text-4xl",
};

export interface AmountMonoProps {
  /** Pre-formatted amount string, e.g. "$0.000001" (format via @sluice/money at the edge). */
  value: string;
  size?: keyof typeof SIZE;
  tone?: "hi" | "mid" | "low" | "settled" | "failed";
  /** De-emphasize the fractional part for a premium ledger feel. */
  dimDecimals?: boolean;
  className?: string;
}

const TONE_CLASS: Record<NonNullable<AmountMonoProps["tone"]>, string> = {
  hi: "text-hi",
  mid: "text-mid",
  low: "text-low",
  settled: "text-settled",
  failed: "text-failed",
};

/** Tabular monospace amount. The canonical way to render money/rates/figures. */
export function AmountMono({
  value,
  size = "md",
  tone = "hi",
  dimDecimals = false,
  className,
}: AmountMonoProps) {
  const dotIndex = value.lastIndexOf(".");
  const hasFraction = dotIndex !== -1;
  const head = hasFraction ? value.slice(0, dotIndex) : value;
  const tail = hasFraction ? value.slice(dotIndex) : "";

  return (
    <span className={cn("font-mono tnum tracking-tight", SIZE[size], TONE_CLASS[tone], className)}>
      {head}
      {hasFraction && <span className={cn(dimDecimals && "text-low")}>{tail}</span>}
    </span>
  );
}
