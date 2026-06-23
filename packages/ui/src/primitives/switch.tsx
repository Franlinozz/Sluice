"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "../cn.ts";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-edge bg-surface-3 transition-colors",
      "data-[state=checked]:border-transparent data-[state=checked]:bg-signal",
      "disabled:cursor-not-allowed disabled:opacity-45",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-4 translate-x-0.5 rounded-full bg-mid transition-transform",
        "data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-signal-contrast",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
