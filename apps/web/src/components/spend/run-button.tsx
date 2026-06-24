"use client";

import * as React from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { Button } from "@sluice/ui";
import { runAgentAction } from "@/lib/actions";

export function RunButton({ agentId }: { agentId: string }) {
  const [pending, start] = React.useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await runAgentAction(agentId);
          if (!res.ok) {
            toast.error("Run failed", { description: res.error });
            return;
          }
          const r = res.data!;
          toast.success(`Run ${r.status}`, {
            description: `${r.mode} · spent ${r.formattedSpent} · paid ${r.paidCount}/${r.steps}`,
          });
        })
      }
    >
      <Play className="size-4" />
      {pending ? "Reasoning…" : "Run session"}
    </Button>
  );
}
