"use client";

import * as React from "react";
import { Tooltip as T } from "radix-ui";
import { cn } from "../cn.ts";

export const TooltipProvider = T.Provider;
export const Tooltip = T.Root;
export const TooltipTrigger = T.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof T.Content>) {
  return (
    <T.Portal>
      <T.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-md border border-edge bg-surface-3 px-2.5 py-1.5 text-xs leading-relaxed text-hi shadow-[var(--shadow-pop)]",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        <T.Arrow className="fill-surface-3" />
      </T.Content>
    </T.Portal>
  );
}

/** Convenience: an inline help tooltip for disabled controls' stated reasons. */
export function HelpTip({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
