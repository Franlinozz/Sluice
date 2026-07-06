"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, PlugZap } from "lucide-react";
import { Button, Card, Input, Label } from "@sluice/ui";

/**
 * Cross-team listing form (R5): another team registers THEIR x402 endpoint on the Sluice Bazaar.
 * The API probes it for a real 402 + payment requirements before listing — no dead listings.
 */
export function PartnerForm() {
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    fetch("/api/sluice/partners/endpoints", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(fd.get("name") ?? ""),
        team: String(fd.get("team") ?? ""),
        endpointUrl: String(fd.get("endpointUrl") ?? ""),
        contact: String(fd.get("contact") ?? "") || undefined,
        description: String(fd.get("description") ?? "") || undefined,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.registered) {
          setDone(res.resourceId);
          toast.success("Listed on the Bazaar", { description: "x402 probe passed — our agents can now pay your endpoint." });
        } else {
          toast.error("Listing failed", { description: res?.error ?? "API error" });
        }
      })
      .catch(() => toast.error("Listing failed", { description: "API unreachable" }))
      .finally(() => setPending(false));
  };

  if (done) {
    return (
      <Card className="my-5 p-5">
        <p className="text-sm text-hi">✓ Listed. Your endpoint is on the Bazaar and payable by Sluice agents.</p>
        <p className="mt-1 text-xs text-mid">
          It appears on <a href="/app/discover" className="text-steel hover:underline">/app/discover</a> and the{" "}
          <a href="/traction" className="text-steel hover:underline">/traction</a> partners strip.
        </p>
      </Card>
    );
  }

  return (
    <Card className="my-5 p-5">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-name">Endpoint name</Label>
            <Input id="pt-name" name="name" required placeholder="Weather oracle · per request" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-team">Team</Label>
            <Input id="pt-team" name="team" required placeholder="your team name" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pt-url">x402 endpoint URL (must answer 402)</Label>
          <Input id="pt-url" name="endpointUrl" required type="url" placeholder="https://api.yourteam.dev/paid/thing" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-contact">Contact (optional)</Label>
            <Input id="pt-contact" name="contact" placeholder="@handle or email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-desc">One-line description (optional)</Label>
            <Input id="pt-desc" name="description" placeholder="What agents get for paying" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-low">We probe your URL for a real 402 before listing.</p>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
            {pending ? "Probing…" : "Probe & list my endpoint"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
