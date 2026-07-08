"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, UserRound, Link2 } from "lucide-react";
import { AddressChip, Button, Card, Input, Label, Pill } from "@sluice/ui";
import { WalletButton } from "@/components/wallet/wallet-button";
import { ProviderBadge } from "./provider-badge";
import { useProfile } from "./use-profile";

/**
 * Profile editing (R5, rule 16). One profile = one human; linking your other wallets here makes
 * them count as YOU everywhere (never as extra users). Public is opt-in: only then do your
 * actions show your name on /community and in attributions.
 */
export function ProfileCard() {
  const { profile, refresh, ensure, loading, error, connectedWallet, isConnected } = useProfile();
  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [linking, setLinking] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setName(profile.displayName);
      setHandle(profile.handle ?? "");
      setIsPublic(profile.isPublic);
    }
  }, [profile]);

  if (!profile) {
    return (
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <UserRound className="size-5 shrink-0 text-low" />
          <div>
            <h3 className="text-sm font-medium text-hi">Your profile</h3>
            <p className="mt-1 text-sm text-mid">
              One profile per human, however many wallets you link. It attributes your asks and the
              resources you register — and, if you opt in, shows you on /community.
            </p>
          </div>
        </div>

        {!isConnected ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
            <span className="text-sm text-mid">Connect a wallet to create your profile.</span>
            <WalletButton />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
            <Button size="sm" onClick={() => ensure()} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4" />}
              {loading ? "Creating…" : "Create my profile"}
            </Button>
            {connectedWallet && (
              <span className="text-xs text-low">
                for <span className="font-mono text-mid">{connectedWallet.slice(0, 6)}…{connectedWallet.slice(-4)}</span>
              </span>
            )}
            {error && <span className="text-xs text-[color:var(--failed)]">{error}</span>}
          </div>
        )}
      </Card>
    );
  }

  const save = () => {
    setSaving(true);
    fetch(`/api/sluice/profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name, handle: handle || null, isPublic }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.id) {
          toast.success("Profile saved");
          refresh();
        } else toast.error("Could not save", { description: res?.error });
      })
      .catch(() => toast.error("Could not save"))
      .finally(() => setSaving(false));
  };

  const canLink =
    connectedWallet && !profile.wallets.includes(connectedWallet.toLowerCase());

  const link = () => {
    if (!connectedWallet) return;
    setLinking(true);
    fetch(`/api/sluice/profiles/${profile.id}/wallets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: connectedWallet }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.id) {
          toast.success("Wallet linked — it counts as you now (one human, everywhere)");
          refresh();
        } else toast.error("Could not link", { description: res?.error });
      })
      .catch(() => toast.error("Could not link"))
      .finally(() => setLinking(false));
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-steel" />
          <h3 className="text-sm font-medium text-hi">Your profile</h3>
          <ProviderBadge provider={profile.authProvider} showLabel />
        </div>
        <Pill tone={profile.isPublic ? "settled" : "neutral"} dot>
          {profile.isPublic ? "public" : "private"}
        </Pill>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-name">Display name</Label>
          <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-handle">Handle (public, optional)</Label>
          <Input
            id="pf-handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            placeholder="e.g. fran"
            maxLength={24}
          />
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-mid">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--flow)]"
        />
        <span>
          Show me on <span className="text-hi">/community</span> and attribute my actions
          (&quot;asked by @{handle || "you"}&quot;). Off by default — your call.
        </span>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-low">Linked wallets (all count as ONE user):</span>
          {profile.wallets.map((w) => (
            <AddressChip key={w} address={w} chars={4} />
          ))}
          {canLink && (
            <Button variant="outline" size="sm" onClick={link} disabled={linking}>
              {linking ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
              Link connected wallet
            </Button>
          )}
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save profile
        </Button>
      </div>
    </Card>
  );
}
