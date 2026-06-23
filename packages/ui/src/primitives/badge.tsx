import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn.ts";

const badge = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        neutral: "border-edge bg-surface-2 text-mid",
        outline: "border-edge bg-transparent text-mid",
        solid: "border-transparent bg-surface-3 text-hi",
        signal: "border-transparent bg-signal text-signal-contrast",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}
