"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { Button } from "@sluice/ui";

/**
 * Resolve an active bond: RELEASE it back to the provider (delivered) or SLASH it to the buyer
 * (underdelivery). Both are real arbiter transactions on the BondEscrow + an ERC-8004 feedback tx.
 */
export function ResolveButtons({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<null | "release" | "slash">(null);

  function resolve(outcome: "release" | "slash") {
    const reason =
      outcome === "slash"
        ? window.prompt("Reason for slashing (what was underdelivered)?", "Underdelivery")
        : window.prompt("Reason for release (confirm delivery)?", "Delivered on spec");
    if (reason === null) return; // cancelled
    setPending(outcome);
    fetch(`/api/sluice/matches/${matchId}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outcome, reason: reason || undefined }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.status === "released" || res?.status === "slashed") {
          toast.success(outcome === "slash" ? "Bond slashed to the buyer" : "Bond released to the provider", {
            description: "On-chain — reputation updated.",
          });
          router.refresh();
        } else {
          toast.error("Resolve failed", { description: res?.error ?? "API error" });
        }
      })
      .catch(() => toast.error("Resolve failed", { description: "API unreachable" }))
      .finally(() => setPending(null));
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => resolve("release")}>
        {pending === "release" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        Release
      </Button>
      <Button size="sm" variant="danger" disabled={pending !== null} onClick={() => resolve("slash")}>
        {pending === "slash" ? <Loader2 className="size-4 animate-spin" /> : <ShieldX className="size-4" />}
        Slash
      </Button>
    </div>
  );
}
