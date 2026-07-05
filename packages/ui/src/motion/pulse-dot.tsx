"use client";

import * as React from "react";
import { cn } from "../cn.ts";

/**
 * The live indicator (flow accent): a dot with a soft expanding pulse ring while `active`.
 * Static dot when inactive or under prefers-reduced-motion.
 */
export function PulseDot({ active = true, className }: { active?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2", className)} aria-hidden>
      {active && (
        <span
          className="absolute inline-flex size-full rounded-full opacity-60 motion-reduce:hidden"
          style={{ backgroundColor: "var(--flow)", animation: "sluice-ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }}
        />
      )}
      <span
        className="relative inline-flex size-2 rounded-full"
        style={{ backgroundColor: active ? "var(--flow)" : "var(--text-low)" }}
      />
    </span>
  );
}
