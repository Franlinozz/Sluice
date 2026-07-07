"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Coins, Wallet } from "lucide-react";
import { Button, Card, Input, Label, cn } from "@sluice/ui";
import { registerResourceAction } from "@/lib/actions";
import { WalletButton } from "@/components/wallet/wallet-button";

const UNIT_TYPES = [
  "per_request",
  "per_citation",
  "per_second",
  "per_byte",
  "per_token",
  "per_listen",
  "per_view",
] as const;

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function RegisterForm() {
  const { address, isConnected } = useAccount();
  const [pending, start] = React.useTransition();
  const [unitType, setUnitType] = React.useState<string>("per_request");
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Card className="p-6" data-tour="earn">
      <div className="eyebrow mb-4">Register a resource</div>

      {/* Payout destination — whose wallet earns when this resource is used. Made explicit so a
          creator never unknowingly registers to the shared platform wallet. */}
      <div
        className={cn(
          "mb-4 flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2 text-xs",
          isConnected ? "border-hairline bg-surface-1 text-mid" : "border-[var(--pending)]/30 bg-[var(--pending)]/10 text-hi",
        )}
      >
        <Wallet className="size-3.5 shrink-0 text-steel" />
        {isConnected && address ? (
          <span>
            Payouts go to your connected wallet{" "}
            <span className="font-mono text-hi">{shortAddr(address)}</span> — you earn every time an
            agent cites or consumes it.
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            Connect a wallet so <span className="font-medium">you</span> earn — otherwise this
            registers to the shared demo wallet.
            <WalletButton />
          </span>
        )}
      </div>

      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            const res = await registerResourceAction({
              name: String(fd.get("name") ?? ""),
              description: String(fd.get("description") ?? ""),
              profileId: localStorage.getItem("sluice-profile-id") ?? undefined,
              payTo: address ?? undefined,
              unitType: String(fd.get("unitType") ?? "per_request"),
              price: String(fd.get("price") ?? ""),
              path: String(fd.get("path") ?? ""),
            });
            if (res.ok) {
              toast.success("Resource registered", {
                description: address
                  ? `Earns to ${shortAddr(address)} · ${res.data?.endpoint ?? ""}`
                  : res.data?.endpoint,
              });
              formRef.current?.reset();
              setUnitType("per_request");
            } else {
              toast.error("Could not register", { description: res.error });
            }
          })
        }
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
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
