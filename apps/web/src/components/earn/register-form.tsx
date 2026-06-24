"use client";

import * as React from "react";
import { toast } from "sonner";
import { Coins } from "lucide-react";
import { Button, Card, Input, Label, cn } from "@sluice/ui";
import { registerResourceAction } from "@/lib/actions";

const UNIT_TYPES = [
  "per_request",
  "per_citation",
  "per_second",
  "per_byte",
  "per_token",
  "per_listen",
  "per_view",
] as const;

export function RegisterForm() {
  const [pending, start] = React.useTransition();
  const [unitType, setUnitType] = React.useState<string>("per_request");
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Card className="p-6">
      <div className="eyebrow mb-4">Register a resource</div>
      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            const res = await registerResourceAction({
              name: String(fd.get("name") ?? ""),
              description: String(fd.get("description") ?? ""),
              unitType: String(fd.get("unitType") ?? "per_request"),
              price: String(fd.get("price") ?? ""),
              path: String(fd.get("path") ?? ""),
            });
            if (res.ok) {
              toast.success("Resource registered", { description: res.data?.endpoint });
              formRef.current?.reset();
              setUnitType("per_request");
            } else {
              toast.error("Could not register", { description: res.error });
            }
          })
        }
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Premium Quote" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="path">Path (slug)</Label>
          <Input id="path" name="path" required placeholder="premium-quote" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unitType">Unit</Label>
          <select
            id="unitType"
            name="unitType"
            value={unitType}
            onChange={(e) => setUnitType(e.target.value)}
            className={cn(
              "h-9 w-full rounded-[10px] border border-edge bg-surface-1 px-3 text-sm text-hi",
              "focus-visible:border-steel focus-visible:outline-none",
            )}
          >
            {UNIT_TYPES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price per unit (USDC)</Label>
          <Input id="price" name="price" required placeholder="$0.001" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" placeholder="What this resource provides" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            <Coins className="size-4" />
            {pending ? "Registering…" : "Register resource"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
