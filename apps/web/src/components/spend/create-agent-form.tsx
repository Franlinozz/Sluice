"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { Button, Card, Input, Label } from "@sluice/ui";
import { createAgentAction } from "@/lib/actions";

export function CreateAgentForm() {
  const [pending, start] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Card className="p-6">
      <div className="eyebrow mb-4">Create a buyer agent</div>
      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            const res = await createAgentAction({
              name: String(fd.get("name") ?? ""),
              task: String(fd.get("task") ?? ""),
              budget: String(fd.get("budget") ?? ""),
              policy: String(fd.get("policy") ?? ""),
            });
            if (res.ok) {
              toast.success("Agent created", {
                description: "Plain-English policy parsed into enforceable rules.",
              });
              formRef.current?.reset();
            } else {
              toast.error("Could not create agent", { description: res.error });
            }
          })
        }
        className="grid grid-cols-1 gap-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Citation Research Agent" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget">Budget (USDC)</Label>
            <Input id="budget" name="budget" required placeholder="$0.01" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task">Task</Label>
          <Input
            id="task"
            name="task"
            required
            placeholder="Research how AI agents pay for content on stablecoin rails"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="policy">Spend policy (plain English)</Label>
          <Input
            id="policy"
            name="policy"
            placeholder="Only pay for AI, agent and stablecoin sources under $0.005 per unit"
          />
          <p className="text-xs text-low">
            Parsed by the model into rules, then enforced deterministically at the payment layer —
            raw model output never authorizes a payment.
          </p>
        </div>
        <div>
          <Button type="submit" disabled={pending}>
            <Bot className="size-4" />
            {pending ? "Creating…" : "Create agent"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
