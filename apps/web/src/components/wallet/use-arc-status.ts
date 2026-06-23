"use client";

import { useBlockNumber } from "wagmi";
import { arcConfig } from "@sluice/chain";
import type { LiveStatus } from "@sluice/ui";

/** Real Arc connectivity for the "Live" badge — derived from polling the latest block. */
export function useArcStatus(): { status: LiveStatus; blockNumber?: bigint } {
  const { data, isError, isLoading } = useBlockNumber({
    chainId: arcConfig.chainId,
    query: { refetchInterval: 10_000, retry: 1 },
  });

  const status: LiveStatus = isError ? "down" : data != null ? "live" : isLoading ? "connecting" : "connecting";
  return { status, blockNumber: data };
}
