"use client";

import * as React from "react";
import { cn } from "../cn.ts";

/**
 * New list rows slide-fade in at the top of a feed. Animates once on mount (key rows by id);
 * `index` staggers a cascade. Transform/opacity only; reduced-motion renders static.
 */
export function RowEnter({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("motion-safe:animate-[sluice-row-enter_0.4s_ease-out_both]", className)}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      {children}
    </div>
  );
}
