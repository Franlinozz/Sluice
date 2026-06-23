import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../cn.ts";

export interface StepItem {
  label: string;
  description?: React.ReactNode;
}

/** Vertical stepper for flows like the one-time Gateway deposit / onboarding. */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: StepItem[];
  /** Index of the active step. Steps before it render as done. */
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === steps.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-3 top-7 h-[calc(100%-1.5rem)] w-px bg-hairline"
              />
            )}
            <span
              className={cn(
                "z-10 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-medium",
                done
                  ? "border-transparent bg-signal text-signal-contrast"
                  : active
                    ? "border-signal text-hi"
                    : "border-edge text-low",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <div className="pt-0.5">
              <div className={cn("text-sm font-medium", done || active ? "text-hi" : "text-mid")}>
                {step.label}
              </div>
              {step.description && (
                <div className="mt-0.5 text-xs leading-relaxed text-low">{step.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
