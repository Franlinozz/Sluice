"use client";

import * as React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowUpRight, Check, X } from "lucide-react";
import { Card, PulseDot, cn } from "@sluice/ui";

/**
 * First-run checklist (R4): five REAL actions, each auto-checked from real state — wallet
 * connection (wagmi), on-chain USDC balance and Gateway balance (registry API), plus honest
 * per-browser flags for "asked" and "viewed a receipt". No fake progress. Dismissible; hides
 * itself once everything is done.
 */
interface StepState {
  done: boolean;
  label: string;
  href: string;
  external?: boolean;
  hint: string;
}

export function FirstRunChecklist({ initialDismissed = false }: { initialDismissed?: boolean }) {
  const { address, isConnected } = useAccount();
  // The dismissed flag lives in a COOKIE so the server renders the correct state on first paint —
  // a post-mount localStorage flip inserted the card late and caused CLS 0.4 on /app.
  const [dismissed, setDismissed] = React.useState(initialDismissed);
  const [flags, setFlags] = React.useState({ asked: false, receipt: false });
  const [balances, setBalances] = React.useState<{ wallet: number; gateway: number } | null>(null);
  const [ownsResource, setOwnsResource] = React.useState(false);

  React.useEffect(() => {
    setFlags({
      asked: localStorage.getItem("sluice-asked") === "1",
      receipt: localStorage.getItem("sluice-receipt-viewed") === "1",
    });
    const onStorage = () =>
      setFlags({
        asked: localStorage.getItem("sluice-asked") === "1",
        receipt: localStorage.getItem("sluice-receipt-viewed") === "1",
      });
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (!address) {
      setBalances(null);
      return;
    }
    let alive = true;
    const pull = () =>
      fetch(`/api/sluice/gateway/balance?address=${address}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.gateway) {
            setBalances({ wallet: Number(d.wallet?.base ?? 0), gateway: Number(d.gateway.available ?? 0) });
          }
        })
        .catch(() => {});
    pull();
    const id = setInterval(pull, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [address]);

  // "Register something to earn" is checked from real state: does this wallet own a live resource?
  React.useEffect(() => {
    if (!address) {
      setOwnsResource(false);
      return;
    }
    let alive = true;
    fetch(`/api/sluice/resources`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { payTo?: string; archived?: boolean }[]) => {
        if (!alive) return;
        const mine = Array.isArray(list)
          ? list.some((r) => !r.archived && r.payTo?.toLowerCase() === address.toLowerCase())
          : false;
        setOwnsResource(mine);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [address]);

  const steps: StepState[] = [
    {
      done: isConnected,
      label: "Connect a wallet",
      href: "#",
      hint: "Use the Connect button in the top bar (wallet, email, or social).",
    },
    {
      done: (balances?.wallet ?? 0) > 0,
      label: "Get testnet USDC",
      href: "/join",
      hint: "Claim $0.25 from the built-in faucet on the join page — one click, real on-chain transfer.",
    },
    {
      done: ownsResource,
      label: "Register something to earn",
      href: "/earn",
      hint: "List a page, feed, or endpoint — you get paid every time an agent cites it.",
    },
    {
      done: flags.asked,
      label: "Ask the agent one question",
      href: "/ask",
      hint: "Watch it pay every source it cites.",
    },
    {
      done: flags.receipt,
      label: "See your receipt",
      href: "/app/settlements",
      hint: "Every payment leaves one. Check it on Arcscan too.",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (dismissed || allDone) return null;

  return (
    <Card className="p-5" data-tour="checklist">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PulseDot active />
          <span className="text-sm font-medium text-hi">Get to your first real receipt</span>
          <span className="font-mono text-xs text-low">
            {doneCount}/{steps.length}
          </span>
        </div>
        <button
          onClick={() => {
            document.cookie = "sluice-firstrun-dismissed=1; path=/; max-age=31536000; samesite=lax";
            setDismissed(true);
          }}
          aria-label="Dismiss checklist"
          className="rounded-md p-1 text-low transition-colors hover:bg-surface-2 hover:text-hi"
        >
          <X className="size-4" />
        </button>
      </div>
      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => {
          const inner = (
            <>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-medium",
                  s.done ? "border-transparent text-canvas" : "border-edge text-low",
                )}
                style={s.done ? { backgroundColor: "var(--settled)" } : undefined}
              >
                {s.done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-xs font-medium", s.done ? "text-low line-through" : "text-hi")}>
                  {s.label}
                  {s.external && <ArrowUpRight className="ml-0.5 inline size-3 text-low" />}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-low">{s.hint}</span>
              </span>
            </>
          );
          const cls =
            "flex h-full items-start gap-2.5 rounded-[10px] border border-hairline bg-surface-1/50 p-3 transition-colors hover:border-edge";
          return (
            <li key={s.label}>
              {s.href === "#" ? (
                <div className={cls}>{inner}</div>
              ) : s.external ? (
                <a href={s.href} target="_blank" rel="noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link href={s.href} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
