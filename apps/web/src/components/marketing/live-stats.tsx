"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { PulseDot } from "@sluice/ui";
import type { Kpis } from "@/lib/api";

interface Stat {
  label: string;
  value: number;
  format: (n: number) => string;
  /** source note — every number traces to a real field */
  source: string;
}

function useCountUp(target: number, durationMs = 900): number {
  const [v, setV] = React.useState(target);
  const prev = React.useRef(target);
  React.useEffect(() => {
    const from = prev.current;
    const to = target;
    prev.current = target;
    if (from === to) return;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setV(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return v;
}

function StatCell({ stat }: { stat: Stat }) {
  const v = useCountUp(stat.value);
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <div className="font-mono text-2xl tabular-nums text-hi sm:text-3xl">{stat.format(v)}</div>
      <div className="text-xs text-mid">{stat.label}</div>
    </div>
  );
}

/**
 * Live, REAL stats — polled from the registry KPIs (every minute). Every number traces to a real
 * DB/chain field (CLAUDE.md: never faked). Server passes the first snapshot so there's no layout shift.
 */
export function LiveStats({ initial }: { initial: Kpis | null }) {
  const [kpis, setKpis] = React.useState<Kpis | null>(initial);

  React.useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch("/api/sluice/kpis", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setKpis(d as Kpis))
        .catch(() => {});
    const id = setInterval(pull, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const usd = (base: string) => Number(base) / 1e6;
  const k = kpis;
  const stats: Stat[] = [
    {
      label: "Settled on Arc",
      value: k ? usd(k.totalSettled) : 0,
      format: (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`,
      source: "kpis.totalSettled",
    },
    { label: "Units metered", value: k?.unitsMetered ?? 0, format: (n) => Math.round(n).toLocaleString(), source: "kpis.unitsMetered" },
    { label: "Settlements", value: k?.settlements ?? 0, format: (n) => Math.round(n).toLocaleString(), source: "kpis.settlements" },
    { label: "Resources priced", value: k?.resources ?? 0, format: (n) => Math.round(n).toLocaleString(), source: "kpis.resources" },
    { label: "Paying agents", value: k?.payers ?? 0, format: (n) => Math.round(n).toLocaleString(), source: "kpis.payers" },
    { label: "Creators earning", value: k?.creatorsPaid ?? 0, format: (n) => Math.round(n).toLocaleString(), source: "kpis.creatorsPaid" },
  ];

  return (
    <div className="rounded-card border border-hairline bg-surface-1/40">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-2.5">
        <PulseDot active />
        <span className="text-xs text-mid">Live from Sluice — refreshed every minute</span>
        <Activity className="ml-auto size-3.5 text-low" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-hairline sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {stats.map((s) => (
          <StatCell key={s.label} stat={s} />
        ))}
      </div>
    </div>
  );
}
