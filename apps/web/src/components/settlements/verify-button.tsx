"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@sluice/ui";
import { verifyReceiptAction } from "@/lib/actions";

export function VerifyButton({ receiptId }: { receiptId: string }) {
  const [pending, start] = React.useTransition();
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
      <ShieldCheck className="size-3.5" />
      {pending ? "Verifying…" : "Verify"}
    </Button>
  );
}
