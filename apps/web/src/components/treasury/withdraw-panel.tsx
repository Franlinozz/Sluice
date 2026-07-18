"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, ExternalLink, Banknote } from "lucide-react";
import { Button, Card, Input, Label, PulseDot } from "@sluice/ui";
import type { WithdrawChainDTO } from "@/lib/api";

interface Result {
  mintTxHash: string;
  destinationChain: string;
  formattedAmount: string;
  recipient: string;
  explorerUrl: string;
  instant: boolean;
}

/**
 * Withdraw Gateway earnings on-chain. Same-chain (Arc) is an instant Gateway Minter mint; cross-chain
 * burns gas-free on Circle's ledger then mints on the target chain (needs gas there — the API
 * pre-flights and refuses before burning if it's missing). Real txs only.
 */
export function WithdrawPanel({
  available,
  chains,
}: {
  available: string; // formatted, e.g. "0.07"
  chains: WithdrawChainDTO[];
}) {
  const router = useRouter();
  const list = chains.length ? chains : [{ name: "arcTestnet", label: "Arc (instant)", sameChain: true }];
  const [amount, setAmount] = React.useState(() => {
    const max = Math.max(0, Number(available) - 0.004); // leave headroom for the ~0.0035 fee
    return max > 0 ? max.toFixed(4) : "0";
  });
  const [chain, setChain] = React.useState(list[0]!.name);
  const [recipient, setRecipient] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<Result | null>(null);

  const selected = list.find((c) => c.name === chain) ?? list[0]!;

  function submit() {
    if (!(Number(amount) > 0)) {
      toast.error("Enter an amount to withdraw");
      return;
    }
    setPending(true);
    setResult(null);
    fetch("/api/sluice/treasury/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount, chain, recipient: recipient || undefined }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.mintTxHash) {
          setResult(res as Result);
          toast.success(`Withdrew $${res.formattedAmount} to ${res.destinationChain}`, {
            description: res.instant ? "Instant mint" : "Cross-chain mint",
          });
          router.refresh();
        } else if (/request limit|rate.?limit|timed? ?out|timeout|network|busy|fetch failed/i.test(res?.error ?? "")) {
          // RPC congestion, not a definitive refusal — the tx may have landed (hotfix 2026-07-18).
          toast.message("Network busy — withdrawal may still have completed", {
            description:
              "Balances refresh within ~30s. Check your balance (or Arcscan) before retrying, so you don't withdraw twice.",
            duration: 12_000,
          });
          setTimeout(() => router.refresh(), 15_000);
        } else {
          toast.error("Withdrawal failed", { description: res?.error ?? "API error" });
        }
      })
      .catch(() =>
        toast.message("Network busy — withdrawal may still have completed", {
          description:
            "The request didn't come back. Check your balance (or Arcscan) before retrying, so you don't withdraw twice.",
          duration: 12_000,
        }),
      )
      .finally(() => setPending(false));
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-[10px] border border-hairline bg-surface-2 text-steel">
          <Banknote className="size-4.5" />
        </span>
        <div>
          <div className="text-sm font-medium text-hi">Withdraw earnings</div>
          <div className="text-xs text-low">${available} available · mints USDC on-chain</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount (USDC)</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chain">Destination</Label>
          <select
            id="chain"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            disabled={pending}
            className="h-9 w-full rounded-[10px] border border-edge bg-surface-1 px-3 text-sm text-hi focus-visible:border-steel focus-visible:outline-none disabled:opacity-45"
          >
            {list.map((c) => (
              <option key={c.name} value={c.name}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recipient">Recipient (optional — defaults to your wallet)</Label>
        <Input
          id="recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x…"
          disabled={pending}
        />
      </div>

      {pending && (
        <div className="flex items-center gap-2 rounded-[10px] border border-hairline bg-surface-1 p-3 text-xs text-mid">
          <PulseDot active />
          {/* honest states only: the burn intent is signed+submitted, then Circle attests and the
              mint tx lands — we show exactly what we know, when we know it. */}
          <span>Burn intent submitted — awaiting the destination mint…</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-low">
          {selected.sameChain
            ? "Instant mint on Arc — gas paid in native USDC."
            : "Cross-chain: gas-free burn on Circle's ledger, then a mint on the target (needs gas there)."}
        </p>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
          {pending ? "Withdrawing…" : "Withdraw"}
        </Button>
      </div>

      {result && (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-settled/30 bg-surface-1 p-3 text-xs">
          <span className="text-mid motion-safe:animate-[sluice-pop_0.35s_ease-out_both]">
            Minted <span className="font-mono text-hi">${result.formattedAmount}</span> on {result.destinationChain}
          </span>
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-steel hover:underline"
          >
            View mint tx <ExternalLink className="size-3" />
          </a>
        </div>
      )}
    </Card>
  );
}
