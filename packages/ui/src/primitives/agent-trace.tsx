import * as React from "react";
import { Ban, Coins, GitBranch, Sparkles, Wrench } from "lucide-react";
import { cn } from "../cn.ts";
import { AmountMono } from "./amount.tsx";

export type TraceKind = "thought" | "decision" | "tool" | "pay" | "skip";

export interface TraceStep {
  kind: TraceKind;
  title: string;
  detail?: React.ReactNode;
  /** Pre-formatted amount for "pay" steps, e.g. "$0.002". */
  amount?: string;
}

const KIND_META: Record<
  TraceKind,
  { Icon: typeof Sparkles; ring: string; tint: string }
> = {
  thought: { Icon: Sparkles, ring: "border-edge", tint: "text-mid" },
  decision: { Icon: GitBranch, ring: "border-edge", tint: "text-hi" },
  tool: { Icon: Wrench, ring: "border-edge", tint: "text-info" },
  pay: { Icon: Coins, ring: "border-edge", tint: "text-settled" },
  skip: { Icon: Ban, ring: "border-edge", tint: "text-low" },
};

/** The agent's visible reasoning trace — why it paid, what it paid, what it got. */
export function AgentTrace({ steps, className }: { steps: TraceStep[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((step, i) => {
        const { Icon, ring, tint } = KIND_META[step.kind];
        const isLast = i === steps.length - 1;
        return (
          <li
            key={i}
            className="relative flex gap-3 pb-5 last:pb-0 motion-safe:animate-[sluice-row-enter_0.4s_ease-out_both]"
            style={{ animationDelay: `${Math.min(i, 14) * 60}ms` }}
          >
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 h-[calc(100%-1.75rem)] w-px bg-hairline"
              />
            )}
            <span
              className={cn(
                "z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-surface-1",
                ring,
                tint,
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-hi">{step.title}</span>
                {step.amount && (
                  <AmountMono
                    value={step.amount}
                    size="xs"
                    tone={step.kind === "pay" ? "settled" : "mid"}
                  />
                )}
              </div>
              {step.detail && (
                <div className="mt-0.5 text-xs leading-relaxed text-mid">{step.detail}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
