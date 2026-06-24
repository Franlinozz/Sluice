"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Radio } from "lucide-react";
import { Button } from "@sluice/ui";

export function StartStream({ resourceId, reserveSeconds = 600 }: { resourceId: string; reserveSeconds?: number }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await fetch("/api/sluice/sessions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ resourceId, reserveSeconds }),
          })
            .then((x) => x.json())
            .catch(() => null);
          if (r?.id) router.push(`/app/meter/${r.id}`);
          else toast.error("Could not start session", { description: r?.error });
        })
      }
    >
      <Radio className="size-4" />
      {pending ? "Starting…" : "Start session"}
    </Button>
  );
}
