import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn.ts";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-[background-color,opacity,border-color,color] duration-150 select-none disabled:pointer-events-none disabled:opacity-45 transition-transform duration-100 active:scale-[0.98] motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        signal:
          "bg-signal text-signal-contrast hover:opacity-90 active:opacity-100 hover:shadow-[0_0_24px_var(--flow-glow)] motion-reduce:hover:shadow-none",
        secondary: "bg-surface-2 text-hi border border-edge hover:bg-surface-3",
        outline: "border border-edge text-hi hover:bg-surface-2",
        ghost: "text-mid hover:text-hi hover:bg-surface-2",
        danger: "bg-failed text-canvas hover:opacity-90",
        link: "text-steel underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "signal", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  /** Render as the child element (e.g. an <a> or <Link>) instead of <button>. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return (
      <Comp
        ref={ref}
        className={cn(button({ variant, size }), className)}
        type={asChild ? undefined : (type ?? "button")}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { button as buttonVariants };
