"use client";

import * as React from "react";
import { useAccount } from "wagmi";

/**
 * Profile hook (R5, rule 16). When a wallet connects, get-or-create THE ONE profile for this
 * human (POST /profiles/ensure — linked wallets resolve to the same profile). The id persists in
 * localStorage so attribution (asks, registrations) survives reloads.
 */
export interface ProfileDTO {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  isPublic: boolean;
  joinedAt: string;
  wallets: string[];
}

export function useProfile() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = React.useState<ProfileDTO | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const id = localStorage.getItem("sluice-profile-id");
    if (!id) return;
    const p = await fetch(`/api/sluice/profiles/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (p?.id) setProfile(p as ProfileDTO);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // ensure on connect (referral handle captured by /join, applied once at creation)
  React.useEffect(() => {
    if (!isConnected || !address) return;
    let alive = true;
    setLoading(true);
    fetch("/api/sluice/profiles/ensure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: address, refHandle: localStorage.getItem("sluice-ref") ?? undefined }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (alive && p?.id) {
          localStorage.setItem("sluice-profile-id", p.id);
          setProfile(p as ProfileDTO);
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isConnected, address]);

  return { profile, loading, refresh, connectedWallet: address ?? null };
}
