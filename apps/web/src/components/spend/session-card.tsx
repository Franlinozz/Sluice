"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  AgentTrace,
  Badge,
  Card,
  Pill,
  StatusPill,
  cn,
  type TraceKind,
} from "@sluice/ui";
import type { AgentDTO, DecisionDTO } from "@/lib/api";
import { RunButton } from "./run-button";

/**
 * Agent session card (R4 readability): collapsed by default to a summary row — name, task,
 * spent/budget bar, paid/skipped counts, value — expanding to the full reasoning trace with
 * Paid/Skipped/Capped filters and a sticky session header while you scroll a long trace.
 */
const KIND: Record<DecisionDTO["decision"], TraceKind> = {
  pay: "pay",
  skip: "skip",
  capped: "decision",
};

type Filter = "all" | "pay" | "skip" | "capped";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pay", label: "Paid" },
  { key: "skip", label: "Skipped" },
  { key: "capped", label: "Capped" },
];

function RunStatusPill({ status }: { status: string }) {
  if (status === "completed") return <StatusPill status="settled" withDot />;
  if (status === "paused") return <StatusPill status="batching" withDot />;
  if (status === "failed") return <StatusPill status="failed" withDot />;
  return (
    <Pill tone="info" dot>
      running
    </Pill>
  );
}

export function SessionCard({ agent, defaultOpen = false }: { agent: AgentDTO; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [filter, setFilter] = React.useState<Filter>("all");
  const run = agent.latestRun;
  const budget = Number(agent.budget);
  const spent = run ? Number(run.spent) : 0;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const decisions = run?.decisions ?? [];
  const counts = {
    pay: decisions.filter((d) => d.decision === "pay").length,
    skip: decisions.filter((d) => d.decision === "skip").length,
    capped: decisions.filter((d) => d.decision === "capped").length,
  };
  const filtered = filter === "all" ? decisions : decisions.filter((d) => d.decision === filter);
  const trace = filtered.map((d) => ({
    kind: KIND[d.decision],
    title: `${d.decision === "capped" ? "Capped" : d.decision === "pay" ? "Paid" : "Skipped"} · ${d.resourceName}`,
    detail: `${d.reason} (relevance ${d.relevance}/100)`,
    amount: d.paid ? (d.formattedAmount ?? undefined) : undefined,
  }));

  return (
    <Card className="overflow-hidden p-0">
      {/* summary row — always visible, sticky while the trace scrolls */}
      <div className={cn("bg-surface-1 px-6 py-5", open && "sticky top-16 z-10 border-b border-hairline")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-medium text-hi">{agent.name}</span>
              {run && <Badge variant={run.mode === "live" ? "signal" : "neutral"}>{run.mode}</Badge>}
              {run && <RunStatusPill status={run.status} />}
            </div>
            <p className="mt-1 max-w-xl truncate text-sm text-mid">{agent.task}</p>
          </div>
          <div className="flex items-center gap-2">
            <RunButton agentId={agent.id} />
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? "Collapse session" : "Expand session"}
              className="grid size-8 place-items-center rounded-[8px] border border-hairline text-mid transition-colors hover:bg-surface-2 hover:text-hi"
            >
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* budget bar + counts */}
        <div className="mt-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-low">
              spent <span className="font-mono text-mid">{run?.formattedSpent ?? "$0.00"}</span> / {agent.formattedBudget}
            </span>
            {run && (
              <span className="text-low">
                {counts.pay} paid · {counts.skip} skipped · {counts.capped} capped
                {run.value ? ` · value ${run.value}` : ""}
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500 ease-out", pct >= 100 ? "bg-pending" : "bg-steel")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* expanded: policy + filterable reasoning trace */}
      {open && (
        <div className="px-6 pb-6 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="eyebrow">policy</span>
            {agent.rules.formattedPriceCeiling && (
              <Badge variant="outline">ceiling {agent.rules.formattedPriceCeiling}</Badge>
            )}
            <Badge variant="outline">≥{agent.rules.relevanceThreshold} relevance</Badge>
            {agent.rules.topics.slice(0, 5).map((t) => (
              <Badge key={t} variant="neutral">
                {t}
              </Badge>
            ))}
          </div>

          {run ? (
            <>
              <div className="mt-4 flex items-center gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    aria-pressed={filter === f.key}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      filter === f.key
                        ? "border-steel/40 bg-surface-2 text-hi"
                        : "border-edge text-mid hover:bg-surface-2 hover:text-hi",
                    )}
                  >
                    {f.label}
                    {f.key !== "all" && (
                      <span className="ml-1 font-mono text-[10px] text-low">{counts[f.key]}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                {trace.length > 0 ? (
                  <AgentTrace steps={trace} />
                ) : (
                  <p className="text-sm text-low">No {filter === "all" ? "" : `${filter} `}decisions in this session.</p>
                )}
              </div>
              {run.note && <p className="mt-3 text-xs text-low">{run.note}</p>}
            </>
          ) : (
            <p className="mt-4 text-sm text-low">No runs yet — press “Run session”.</p>
          )}
        </div>
      )}
    </Card>
  );
}
