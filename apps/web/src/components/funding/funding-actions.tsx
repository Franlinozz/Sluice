"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeartHandshake, Sparkles, Loader2 } from "lucide-react";
import { Button, Card, Input, Label } from "@sluice/ui";

/** Tip a creator (a real on-chain USDC transfer from the platform's demo backer) → feeds QF. */
export function TipForm() {
  const router = useRouter();
  const [creator, setCreator] = React.useState("");
  const [amount, setAmount] = React.useState("0.01");
  const [label, setLabel] = React.useState("");
  const [pending, start] = React.useTransition();

  function submit() {
    if (!/^0x[0-9a-fA-F]{40}$/.test(creator.trim())) {
      toast.error("Enter a valid creator address (0x…)");
      return;
    }
    start(async () => {
      const res = await fetch("/api/sluice/funding/tip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creator: creator.trim(), amountUsd: amount, label: label.trim() || undefined }),
      })
        .then((r) => r.json())
        .catch(() => null);
      if (res?.ok) {
        toast.success("Tip posted on-chain", { description: "It now counts toward the quadratic match." });
        setCreator("");
        setLabel("");
        router.refresh();
      } else {
        toast.error("Tip failed", { description: res?.error ?? "API error" });
      }
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-[10px] border border-hairline bg-surface-2 text-steel">
          <HeartHandshake className="size-4.5" />
        </span>
        <div>
          <div className="text-sm font-medium text-hi">Tip a creator</div>
          <div className="text-xs text-low">Real on-chain USDC — breadth of backers is matched quadratically.</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="creator">Creator address</Label>
        <Input id="creator" value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="0x…" disabled={pending} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="famount">Amount (USDC)</Label>
          <Input id="famount" type="number" min="0.001" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="flabel">Label (optional)</Label>
          <Input id="flabel" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Indie Newsroom" disabled={pending} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <HeartHandshake className="size-4" />}
          {pending ? "Tipping…" : "Tip on-chain"}
        </Button>
      </div>
    </Card>
  );
}

/** Settle the current round: fund the pool to cover matches, then sweep them in one transaction. */
export function SettleButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  function settle() {
    setPending(true);
    fetch("/api/sluice/funding/settle", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      .then((r) => r.json())
      .then((res) => {
        if (res?.distributeTx) {
          toast.success(`Round ${res.round} settled`, { description: "Matches swept to creators on-chain." });
          router.refresh();
        } else {
          toast.error("Settle failed", { description: res?.error ?? "API error" });
        }
      })
      .catch(() => toast.error("Settle failed", { description: "API unreachable" }))
      .finally(() => setPending(false));
  }
  return (
    <Button size="sm" onClick={settle} disabled={pending || disabled}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {pending ? "Settling…" : "Settle round"}
    </Button>
  );
}
