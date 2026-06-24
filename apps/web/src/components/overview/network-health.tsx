"use client";

import { ArrowUpRight } from "lucide-react";
import { Card, LiveDot } from "@sluice/ui";
import { arcConfig } from "@sluice/chain";
import { useArcStatus } from "@/components/wallet/use-arc-status";

export function NetworkHealth() {
  const { status, blockNumber } = useArcStatus();
  return (
    <Card className="p-5">
      <div className="eyebrow mb-3">Network health</div>
      <div className="flex items-center gap-2 text-sm text-hi">
        <LiveDot status={status} />
        Arc Testnet
      </div>
      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <dt className="text-low">Chain ID</dt>
          <dd className="font-mono text-mid">{arcConfig.chainId}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-low">Latest block</dt>
          <dd className="font-mono text-mid">{blockNumber != null ? blockNumber.toString() : "—"}</dd>
        </div>
      </dl>
      <a
        href={arcConfig.explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs text-steel hover:underline"
      >
        Open Arcscan <ArrowUpRight className="size-3" />
      </a>
    </Card>
  );
}
