"use client";

import * as React from "react";
import { cn } from "../cn.ts";

/**
 * Animated numerals for REAL values only (Overhaul rule 17). Eases from the previous value on
 * change; tabular mono so nothing jitters. Reduced-motion → jumps straight to the value.
 * Pass `value` (number) + `format` (how to render it).
 */
export function CountUp({
  value,
  format,
  prefix = "",
  suffix = "",
  decimals = 0,
  durationMs = 800,
  className,
}: {
  value: number;
  /** Client-side callers may pass a formatter; from Server Components use prefix/decimals/suffix. */
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
}) {
  const fmt =
    format ??
    ((n: number) =>
      `${prefix}${decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString()}${suffix}`);
  const [display, setDisplay] = React.useState(value);
  const prev = React.useRef(value);

  React.useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={cn("font-mono tnum", className)}>{fmt(display)}</span>;
}
