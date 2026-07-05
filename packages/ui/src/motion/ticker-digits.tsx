"use client";

import * as React from "react";
import { cn } from "../cn.ts";

const COLUMN = "0123456789";

/**
 * Per-digit rolling odometer for the live streaming meter. Each digit is a vertical column of
 * 0-9 translated to the current digit (transform-only, 60fps); non-digits render static.
 * Pausing the value freezes the odometer exactly where it is. Reduced-motion → plain text.
 */
export function TickerDigits({ value, className }: { value: string; className?: string }) {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  if (reduced) return <span className={cn("font-mono tnum", className)}>{value}</span>;

  return (
    <span className={cn("inline-flex font-mono tnum", className)} aria-label={value} role="text">
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="relative inline-block h-[1em] w-[1ch] overflow-hidden leading-none" aria-hidden>
            <span
              className="absolute left-0 top-0 inline-flex flex-col transition-transform duration-300 ease-out will-change-transform"
              style={{ transform: `translateY(-${Number(ch)}em)` }}
            >
              {COLUMN.split("").map((d) => (
                <span key={d} className="h-[1em] w-[1ch] leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className="inline-block leading-none" aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
