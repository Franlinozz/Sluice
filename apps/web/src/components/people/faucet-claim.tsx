"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { ArrowUpRight, Droplets, Loader2 } from "lucide-react";
import { Button } from "@sluice/ui";
import { useProfile } from "@/components/people/use-profile";

interface FaucetState {
  amount: string;
  eligible: boolean;
  reason?: string;
  claim?: { txHash: string; explorerUrl: string; amount: string; at: number };
}

/**
 * One-click test-USDC drip (one claim per person — linked wallets share it). Every state is
 * honest: eligible → button; claimed → the real Arcscan tx; ineligible → the stated reason
 * (rule 2: no dead controls). Falls back to Circle's faucet link when the pool can't serve.
 */
export function FaucetClaim({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const { profile } = useProfile();
  const [state, setState] = React.useState<FaucetState | null>(null);
  const [claiming, setClaiming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    if (!address || !profile?.id) return;
    fetch(`/api/sluice/faucet/status?profileId=${profile.id}&wallet=${address}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setState(d))
      .catch(() => {});
  }, [address, profile?.id]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const claim = async () => {
    if (!address || !profile?.id || claiming) return;
    setClaiming(true);
    setError(null);
    try {
      const r = await fetch("/api/sluice/faucet/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, wallet: address }),
      });
      const d = (await r.json()) as FaucetState & { error?: string };
      if (!r.ok || d.error) setError(d.error ?? "claim failed");
      else setState(d);
    } catch {
      setError("network error — try again");
    } finally {
      setClaiming(false);
    }
  };

  if (!isConnected || !profile) {
    return <span className="text-xs text-low">Sign in first to claim from the faucet.</span>;
  }
  if (!state) return <span className="text-xs text-low">Checking faucet…</span>;

  if (state.claim) {
    return (
      <span className="text-xs text-mid">
        Claimed ${state.claim.amount}{" "}
        <a href={state.claim.explorerUrl} target="_blank" rel="noreferrer" className="text-steel underline-offset-2 hover:underline">
          view tx <ArrowUpRight className="inline size-3" />
        </a>
      </span>
    );
  }

  if (state.eligible) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <Button size="sm" variant="secondary" onClick={claim} disabled={claiming}>
          {claiming ? <Loader2 className="size-3.5 animate-spin" /> : <Droplets className="size-3.5" />}
          {claiming ? "Sending on Arc…" : `Claim $${state.amount} test USDC`}
        </Button>
        {error && <span className="text-xs text-[color:var(--failed)]">{error}</span>}
      </span>
    );
  }

  return (
    <span className={compact ? "text-xs text-low" : "flex flex-col items-end gap-1 text-right text-xs text-low"}>
      <span>{state.reason}</span>
      <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-steel underline-offset-2 hover:underline">
        Circle faucet <ArrowUpRight className="inline size-3" />
      </a>
    </span>
  );
}
