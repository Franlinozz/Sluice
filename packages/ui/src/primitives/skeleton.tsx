import * as React from "react";
import { cn } from "../cn.ts";

/** Loading placeholder with a shimmer sweep (transform-only). Reduced-motion → static block. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-surface-2", className)}
      aria-hidden
      {...props}
    >
      <span
        className="absolute inset-0 motion-reduce:hidden"
        style={{
          background: "linear-gradient(90deg, transparent, var(--card-toplight), transparent)",
          animation: "sluice-shimmer 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}
