"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
      href: "/app/settlements",
    },
    { label: "Units metered", value: kpis?.unitsMetered ?? 0, format: fmtInt, sub: "across all resources", href: "/app/settlements" },
    { label: "Resources", value: kpis?.resources ?? 0, format: fmtInt, sub: "registered & priced", href: "/app/earn" },
    { label: "Settlements", value: kpis?.settlements ?? 0, format: fmtInt, sub: "settled batches", href: "/app/settlements" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <Link key={t.label} href={t.href} className="group">
          <Card className="h-full p-5">
            <div className="flex items-center justify-between">
              <div className="eyebrow">{t.label}</div>
              <ArrowUpRight className="size-3.5 text-low opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-2 font-mono text-2xl tracking-tight tnum text-hi">
              <CountUp value={t.value} format={t.format} />
            </div>
            <div className="mt-1 text-xs text-low">{t.sub}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
