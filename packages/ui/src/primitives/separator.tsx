import * as React from "react";
import { cn } from "../cn.ts";

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-hairline",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

/** The thin luminous horizon-line motif. */
export function Horizon({ className }: { className?: string }) {
  return <div className={cn("horizon-line", className)} aria-hidden />;
}
