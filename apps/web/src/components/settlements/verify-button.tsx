"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@sluice/ui";
import { verifyReceiptAction } from "@/lib/actions";

export function VerifyButton({ receiptId }: { receiptId: string }) {
  const [pending, start] = React.useTransition();
  const [verified, setVerified] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await verifyReceiptAction(receiptId);
          if (!res.ok) {
            toast.error("Verify failed", { description: res.error });
            return;
          }
          const d = res.data!;
          if (d.verified) {
            setVerified(true);
            toast.success("Verified on-chain", {
              description: d.blockNumber ? `Block ${d.blockNumber}` : undefined,
            });
          } else {
            toast.message("Settlement in progress", {
              description: d.reason ?? "Batching on Circle Gateway (settles asynchronously).",
            });
          }
        })
      }
    >
      {verified ? (
        <ShieldCheck
          className="size-3.5 motion-safe:animate-[sluice-pop_0.35s_ease-out_both]"
          style={{ color: "var(--settled)" }}
        />
      ) : (
        <ShieldCheck className="size-3.5" />
      )}
      {verified ? <span style={{ color: "var(--settled)" }}>Verified</span> : pending ? "Verifying…" : "Verify"}
    </Button>
  );
}
