import * as React from "react";
import { cn } from "../cn.ts";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-[10px] border border-edge bg-surface-1 px-3 text-sm text-hi",
        "placeholder:text-low transition-colors focus-visible:border-steel focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-medium text-mid", className)} {...props} />;
}
