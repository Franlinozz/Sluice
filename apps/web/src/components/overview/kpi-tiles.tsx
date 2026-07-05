"use client";

import { Card, CountUp } from "@sluice/ui";
import type { Kpis } from "@/lib/api";

/**
 * Overview KPI tiles (Overhaul R2): real values count up on load and animate on change
 * (AutoRefresh re-renders with fresh server data; CountUp eases from the previous value).
 */
export function KpiTiles({ kpis }: { kpis: Kpis | null }) {
  const tiles = [
    {
      label: "Total settled",
      value: kpis ? Number(kpis.totalSettled) / 1e6 : 0,
      format: (n: number) => `$${n.toFixed(6)}`,
      sub: "settled on Arc",
    },
    { label: "Units metered", value: kpis?.unitsMetered ?? 0, format: fmtInt, sub: "across all resources" },
    { label: "Resources", value: kpis?.resources ?? 0, format: fmtInt, sub: "registered & priced" },
    { label: "Settlements", value: kpis?.settlements ?? 0, format: fmtInt, sub: "settled batches" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="p-5">
          <div className="eyebrow">{t.label}</div>
          <div className="mt-2 font-mono text-2xl tracking-tight tnum text-hi">
            <CountUp value={t.value} format={t.format} />
          </div>
          <div className="mt-1 text-xs text-low">{t.sub}</div>
        </Card>
      ))}
    </div>
  );
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
