import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "../cn.ts";
import { Card } from "./card.tsx";
import { StatusPill, type SettlementStatus } from "./pill.tsx";
import { DataRow } from "./data-row.tsx";
import { AddressChip } from "./address-chip.tsx";

export interface ReceiptCardProps {
  resource: string;
  units: string;
  rate: string;
  /** Pre-formatted amount, e.g. "$0.004210". */
  amount: string;
  status: SettlementStatus;
  /** Batch settlement tx hash (present once settled). */
  txHash?: string;
  /** Explorer URL for the tx. */
  explorerHref?: string;
  className?: string;
}

/** A verifiable settlement receipt. "Don't trust — verify" via the explorer link. */
export function ReceiptCard({
  resource,
  units,
  rate,
  amount,
  status,
  txHash,
  explorerHref,
  className,
}: ReceiptCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-1.5">Receipt</div>
          <div className="font-display text-sm font-medium text-hi">{resource}</div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-3">
        <DataRow label="Units">
          <span className="font-mono tnum">{units}</span>
        </DataRow>
        <DataRow label="Rate" mono>
          {rate}
        </DataRow>
        <DataRow label="Amount" mono>
          {amount}
        </DataRow>
        <DataRow label="Batch tx">
          {txHash ? (
            <AddressChip address={txHash} href={explorerHref} chars={5} />
          ) : (
            <span className="text-low">— pending batch —</span>
          )}
        </DataRow>
      </div>

      {status === "settled" && txHash && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-settled">
          <ShieldCheck className="size-3.5" />
          Verified on-chain
        </div>
      )}
    </Card>
  );
}
