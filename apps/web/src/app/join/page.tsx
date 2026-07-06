"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ArrowRight, Check } from "lucide-react";
import { Button, Card, PulseDot, cn } from "@sluice/ui";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useProfile } from "@/components/people/use-profile";
import { FaucetClaim } from "@/components/people/faucet-claim";

/**
 * /join (R5): zero → first real receipt in ~3 minutes. Steps auto-check from real state (wallet,
 * balances via the registry, honest per-browser flags). ?ref=handle records WHO INVITED WHOM —
 * once, at profile creation, displayed on /community. No step needs outside knowledge.
 */
function JoinInner() {
  const params = useSearchParams();
  const { address, isConnected } = useAccount();
  const { profile } = useProfile();
  const [flags, setFlags] = React.useState({ asked: false, receipt: false });
  const [balances, setBalances] = React.useState<{ wallet: number; gateway: number } | null>(null);
  const ref = params.get("ref");

  React.useEffect(() => {
    if (ref) localStorage.setItem("sluice-ref", ref.toLowerCase()); // applied once, at creation
  }, [ref]);

  React.useEffect(() => {
    const read = () =>
      setFlags({
        asked: localStorage.getItem("sluice-asked") === "1",
        receipt: localStorage.getItem("sluice-receipt-viewed") === "1",
      });
    read();
    const id = setInterval(read, 4000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!address) return;
    let alive = true;
    const pull = () =>
      fetch(`/api/sluice/gateway/balance?address=${address}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.gateway) setBalances({ wallet: Number(d.wallet?.base ?? 0), gateway: Number(d.gateway.available ?? 0) });
        })
        .catch(() => {});
    pull();
    const id = setInterval(pull, 12_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [address]);

  const steps = [
    {
      title: "Sign in",
      done: isConnected,
      body: "Wallet, email, or social — your profile is created automatically.",
      action: <WalletButton />,
    },
    {
      title: "Get testnet USDC",
      done: (balances?.wallet ?? 0) > 0,
      body: "One click — a real on-chain transfer, one claim per person.",
      action: <FaucetClaim />,
    },
    {
      title: "Deposit into your spending balance",
      done: (balances?.gateway ?? 0) > 0,
      body: "That's what pays per use, gas-free.",
      action: (
        <Button asChild size="sm" variant="secondary">
          <Link href="/app/treasury">Open Treasury</Link>
        </Button>
      ),
    },
    {
      title: "Ask the agent one question",
      done: flags.asked,
      body: "Watch it pay every source it cites — for real.",
      action: (
        <Button asChild size="sm" variant="secondary">
          <Link href="/ask">Ask something</Link>
        </Button>
      ),
    },
    {
      title: "See your receipt",
      done: flags.receipt,
      body: "Every payment leaves one. That's the whole point.",
      action: (
        <Button asChild size="sm" variant="secondary">
          <Link href="/app/settlements">Open Settlements</Link>
        </Button>
      ),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <p className="eyebrow">Join · ~3 minutes to a real receipt</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-hi sm:text-4xl">
        Get paid — or pay — by the fraction.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-mid">
        Five small steps, each one real.{" "}
        {ref && (
          <>
            You were invited by <span className="font-mono text-steel">@{ref.toLowerCase()}</span> — that&apos;s
            recorded honestly, once.
          </>
        )}
      </p>

      <div className="mt-6 flex items-center gap-2 text-xs text-low">
        <PulseDot active={doneCount < steps.length} />
        {doneCount}/{steps.length} done
        {profile && <span>· signed in as {profile.displayName}</span>}
      </div>

      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Card className={cn("flex items-center justify-between gap-4 p-4", s.done && "opacity-70")}>
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-medium",
                    s.done ? "border-transparent text-canvas" : "border-edge text-low",
                  )}
                  style={s.done ? { backgroundColor: "var(--settled)" } : undefined}
                >
                  {s.done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <div className={cn("text-sm font-medium", s.done ? "text-low line-through" : "text-hi")}>{s.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-mid">{s.body}</div>
                </div>
              </div>
              {!s.done && <div className="shrink-0">{s.action}</div>}
            </Card>
          </li>
        ))}
      </ol>

      {doneCount === steps.length && (
        <Card className="mt-6 flex items-center justify-between gap-3 p-5 motion-safe:animate-[sluice-pop_0.4s_ease-out_both]">
          <p className="text-sm text-hi">You&apos;re in — a real payment with a real receipt. Welcome.</p>
          <Button asChild size="sm">
            <Link href="/community">
              Go public on /community <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      )}
    </main>
  );
}

export default function JoinPage() {
  return (
    <React.Suspense fallback={null}>
      <JoinInner />
    </React.Suspense>
  );
}
