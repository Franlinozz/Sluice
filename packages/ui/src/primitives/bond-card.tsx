import * as React from "react";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "../cn.ts";
import { Card } from "./card.tsx";
import { Pill, type PillTone } from "./pill.tsx";
import { AmountMono } from "./amount.tsx";

export type BondStatus = "staked" | "slashed" | "released";

const BOND_META: Record<BondStatus, { tone: PillTone; label: string; Icon: typeof ShieldCheck }> = {
  staked: { tone: "info", label: "Staked", Icon: ShieldCheck },
  slashed: { tone: "failed", label: "Slashed", Icon: ShieldX },
  released: { tone: "neutral", label: "Released", Icon: ShieldAlert },
};

export interface BondCardProps {
  /** Agent / provider the bond stands behind. */
  agent: string;
  /** Pre-formatted bonded amount, e.g. "$5.00". */
  amount: string;
  status: BondStatus;
  /** e.g. "since block 1,204,553" or an ISO date. */
  since?: string;
  className?: string;
}

/** ERC-8004 reputation bond — capital at risk, not a self-reported score. */
export function BondCard({ agent, amount, status, since, className }: BondCardProps) {
  const { tone, label, Icon } = BOND_META[status];
  return (
    <Card className={cn("flex items-center justify-between gap-4 p-5", className)}>
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 place-items-center rounded-[10px] border border-hairline bg-surface-2"
          style={{ color: `var(--${tone === "neutral" ? "text-mid" : tone})` }}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <div className="text-sm font-medium text-hi">{agent}</div>
          {since && <div className="mt-0.5 text-xs text-low">{since}</div>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <AmountMono value={amount} size="lg" tone={status === "slashed" ? "failed" : "hi"} />
        <Pill tone={tone} dot>
          {label}
        </Pill>
      </div>
    </Card>
  );
}
