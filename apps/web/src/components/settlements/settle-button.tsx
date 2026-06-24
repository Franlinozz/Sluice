"use client";

import * as React from "react";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { Button } from "@sluice/ui";
import { settleAction } from "@/lib/actions";

export function SettleButton() {
  const [pending, start] = React.useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await settleAction();
          if (!res.ok) {
            toast.error("Settle failed", { description: res.error });
            return;
          }
          toast.success(`Settled ${res.data?.settled ?? 0} batch group(s)`, {
            description: "Authorized accruals queued for on-chain batch settlement.",
          });
        })
      }
    >
      <Layers className="size-4" />
      {pending ? "Settling…" : "Settle now"}
    </Button>
  );
}
