import * as React from "react";
import { cn } from "../cn.ts";
import { Card } from "./card.tsx";
import { StatusPill, type SettlementStatus } from "./pill.tsx";
import { AmountMono } from "./amount.tsx";
import { Sparkline } from "./sparkline.tsx";

export interface MeterCardProps {
  title: string;
  /** Unit label, e.g. "per citation". */
  unit: string;
  /** Pre-formatted rate, e.g. "$0.000001 / citation". */
  rate: string;
  /** Pre-formatted accrued amount, e.g. "$0.004210". */
  accrued: string;
  status: SettlementStatus;
  /** Progress toward the next batch settle (0–100). */
  settlePct?: number;
  sparkline?: number[];
  className?: string;
}

/** Live accrual card — the heartbeat of the Meter. Values are passed in (no fake data here). */
export function MeterCard({
  title,
  unit,
  rate,
  accrued,
  status,
  settlePct,
  sparkline,
  className,
}: MeterCardProps) {
  const pct = settlePct == null ? null : Math.max(0, Math.min(100, settlePct));
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-1.5">{unit}</div>
          <div className="font-display text-sm font-medium text-hi">{title}</div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <AmountMono value={accrued} size="2xl" dimDecimals />
          <div className="mt-1 text-xs text-low">accrued · {rate}</div>
        </div>
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} className="mb-1 shrink-0" fill />
        )}
      </div>

      {pct != null && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-steel transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-low">
            <span>batch settle threshold</span>
            <span className="font-mono tnum">{pct}%</span>
          </div>
        </div>
      )}
    </Card>
  );
}
