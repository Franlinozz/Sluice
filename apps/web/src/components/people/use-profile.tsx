"use client";

import * as React from "react";
import { useAccount } from "wagmi";

/**
 * Profile hook (R5, rule 16). When a wallet connects, get-or-create THE ONE profile for this
 * human (POST /profiles/ensure — linked wallets resolve to the same profile). The id persists in
 * localStorage so attribution (asks, registrations) survives reloads.
 *
 * Exposes an explicit `ensure()` and `error` so the settings UI can offer a visible, retryable
 * "create my profile" action instead of a silent auto-create that looks like a dead-end when the
 * network hiccups.
 */
export interface ProfileDTO {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  isPublic: boolean;
  joinedAt: string;
  authProvider: string | null;
  wallets: string[];
}

export function useProfile() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = React.useState<ProfileDTO | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const id = localStorage.getItem("sluice-profile-id");
    if (!id) return;
    const p = await fetch(`/api/sluice/profiles/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (p?.id) setProfile(p as ProfileDTO);
  }, []);

  /** Get-or-create the profile for the connected wallet. Safe to call repeatedly. */
  const ensure = React.useCallback(async (): Promise<ProfileDTO | null> => {
    if (!address) {
      setError("Connect a wallet first.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/sluice/profiles/ensure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          refHandle: localStorage.getItem("sluice-ref") ?? undefined,
          authProvider: localStorage.getItem("sluice-auth-provider") ?? undefined,
        }),
      });
      const p = (await r.json().catch(() => null)) as (ProfileDTO & { error?: string }) | null;
      if (!r.ok || !p?.id) {
        setError(p?.error ?? "Could not create your profile — try again.");
        return null;
      }
      localStorage.setItem("sluice-profile-id", p.id);
      setProfile(p);
      return p;
    } catch {
      setError("Network error — try again.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-ensure on connect (referral handle captured by /join, applied once at creation).
  React.useEffect(() => {
    if (!isConnected || !address) return;
    let alive = true;
    void ensure().finally(() => {
      if (!alive) return;
    });
    return () => {
      alive = false;
    };
  }, [isConnected, address, ensure]);

  return { profile, loading, error, refresh, ensure, connectedWallet: address ?? null, isConnected };
}
