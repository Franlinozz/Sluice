"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, Loader2 } from "lucide-react";
import { Button, Card, Input, Label } from "@sluice/ui";

export interface BrokerResourceOption {
  id: string;
  name: string;
}

/**
 * Broker a match: the provider self-bonds real USDC guaranteeing delivery of `need`. Posts to the
 * same-origin proxy → API → on-chain BondEscrow (real Arc txs). On success the match appears in the
 * bond ledger (Agents) where it can be released or slashed.
 */
export function BrokerForm({ resources }: { resources: BrokerResourceOption[] }) {
  const router = useRouter();
  const [need, setNeed] = React.useState("");
  const [resourceId, setResourceId] = React.useState("");
  const [bond, setBond] = React.useState("0.02");
  const [pending, start] = React.useTransition();

  function submit() {
    const trimmed = need.trim();
    if (!trimmed) {
      toast.error("Describe what you're hiring the provider to deliver");
      return;
    }
    start(async () => {
      const res = await fetch("/api/sluice/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ need: trimmed, resourceId: resourceId || undefined, bondUsd: bond }),
      })
        .then((r) => r.json())
        .catch(() => null);
      if (res?.id) {
        toast.success(`Bond posted — $${res.formattedAmount} at risk`, {
          description: "Provider self-bonded on-chain. Resolve it from the bond ledger.",
        });
        setNeed("");
        router.push("/app/agents");
        router.refresh();
      } else {
        toast.error("Could not broker the match", { description: res?.error ?? "API unreachable" });
      }
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-[10px] border border-hairline bg-surface-2 text-steel">
          <Handshake className="size-4.5" />
        </span>
        <div>
          <div className="text-sm font-medium text-hi">Broker a match</div>
          <div className="text-xs text-low">The provider stakes real USDC behind the job — slashed if they underdeliver.</div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="need">What do you need delivered?</Label>
        <Input
          id="need"
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          placeholder="e.g. Summarize the latest 5 AI-policy headlines with citations"
          disabled={pending}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="resource">Resource (optional)</Label>
          <select
            id="resource"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            disabled={pending}
            className="h-9 w-full rounded-[10px] border border-edge bg-surface-1 px-3 text-sm text-hi focus-visible:border-steel focus-visible:outline-none disabled:opacity-45"
          >
            <option value="">— none —</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bond">Bond (USDC)</Label>
          <Input
            id="bond"
            type="number"
            min="0.01"
            step="0.01"
            value={bond}
            onChange={(e) => setBond(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-low">Posts a real bond on Arc — gas + capital move on-chain.</p>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Handshake className="size-4" />}
          {pending ? "Posting bond…" : "Post bond & hire"}
        </Button>
      </div>
    </Card>
  );
}
