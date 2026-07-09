"use client";

import * as React from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { toast } from "sonner";
import { ArrowUpRight, ReceiptText, Search, Sparkles, Wallet } from "lucide-react";
import { AmountMono, Button, Card, PulseDot } from "@sluice/ui";
import { WalletButton } from "@/components/wallet/wallet-button";

/**
 * User-funded ask: the connected human pays the citation toll from THEIR OWN wallet via an EIP-3009
 * `transferWithAuthorization` signature (gasless — the operator relays it). The receipt records the
 * user as the payer, so a real person becomes a distinct paying agent — not the shared demo agent.
 */
interface PrepItem {
  resourceId: string;
  name: string;
  author: string | null;
  sourceUrl: string | null;
  payTo: string;
  formattedAmount: string;
  typedData: {
    domain: { name: string; version: string; chainId: number; verifyingContract: string };
    types: Record<string, { name: string; type: string }[]>;
    primaryType: string;
    message: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}
interface SubmitOk {
  ok: true;
  answer: string;
  txHash: string;
  explorerUrl: string;
  citation: { name: string; author: string | null; sourceUrl: string | null; formattedAmount: string; payTo: string };
}

type Phase = "idle" | "preparing" | "signing" | "submitting" | "done";

export function UserPayAsk() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [q, setQ] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [result, setResult] = React.useState<SubmitOk | null>(null);
  const busy = phase === "preparing" || phase === "signing" || phase === "submitting";

  const run = async () => {
    if (!q.trim() || !address) return;
    setResult(null);
    setPhase("preparing");
    try {
      const prepRes = await fetch("/api/sluice/research/user-pay/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q.trim(),
          address,
          profileId: localStorage.getItem("sluice-profile-id") ?? undefined,
        }),
      });
      const prep = (await prepRes.json().catch(() => null)) as
        | { requestId: string | null; reason?: string; item?: PrepItem }
        | null;
      if (!prepRes.ok || !prep) {
        toast.error("Couldn't prepare the payment", { description: (prep as { error?: string })?.error });
        setPhase("idle");
        return;
      }
      if (!prep.requestId || !prep.item) {
        toast.message("No paid source matched", {
          description: prep.reason ?? "No registered source was relevant enough to ground a paid answer.",
        });
        setPhase("idle");
        return;
      }

      const { requestId, item } = prep;
      const m = item.typedData.message;
      setPhase("signing");
      const signature = await signTypedDataAsync({
        domain: item.typedData.domain,
        types: item.typedData.types,
        primaryType: item.typedData.primaryType,
        message: {
          from: m.from,
          to: m.to,
          value: BigInt(m.value),
          validAfter: BigInt(m.validAfter),
          validBefore: BigInt(m.validBefore),
          nonce: m.nonce,
        },
        // The server-built typed data is dynamic; wagmi's generic inference can't see it.
      } as Parameters<typeof signTypedDataAsync>[0]);

      setPhase("submitting");
      const subRes = await fetch("/api/sluice/research/user-pay/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, signature }),
      });
      const sub = (await subRes.json().catch(() => null)) as (SubmitOk & { error?: string }) | null;
      if (!subRes.ok || !sub?.ok) {
        toast.error("Payment failed", { description: sub?.error ?? "The on-chain payment didn't go through." });
        setPhase("idle");
        return;
      }
      setResult(sub);
      setPhase("done");
      try {
        localStorage.setItem("sluice-asked", "1");
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // User rejecting the wallet prompt is not an error worth shouting about.
      if (/reject|denied|cancell?ed/i.test(msg)) toast.message("Signature cancelled");
      else toast.error("Something went wrong", { description: msg.slice(0, 140) });
      setPhase("idle");
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 size-5 shrink-0 text-steel" />
        <div>
          <h3 className="text-sm font-medium text-hi">Ask & pay from your wallet</h3>
          <p className="mt-1 text-sm text-mid">
            You sign one gasless authorization; the toll is paid from your own USDC to the source it
            cites. You become the payer — a real, on-chain settlement in your name.
          </p>
        </div>
      </div>

      {!isConnected ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
          <span className="text-sm text-mid">Connect a wallet to pay from it.</span>
          <WalletButton />
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-edge bg-surface-1 px-3">
            <Search className="size-4 text-low" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question — you'll pay the source it cites…"
              disabled={busy}
              className="h-11 w-full bg-transparent text-sm text-hi outline-none placeholder:text-low"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy || !q.trim()}>
            <Sparkles className="size-4" />
            {phase === "preparing"
              ? "Finding a source…"
              : phase === "signing"
                ? "Confirm in wallet…"
                : phase === "submitting"
                  ? "Settling on-chain…"
                  : "Ask & pay"}
          </Button>
        </form>
      )}

      {busy && (
        <p className="flex items-center gap-2 text-xs text-low">
          <PulseDot active />
          {phase === "signing"
            ? "Sign the transfer authorization in your wallet — no gas, just a signature."
            : phase === "submitting"
              ? "Relaying your signed authorization to Arc — real USDC moving to the creator."
              : "Reasoning over registered sources to find the one worth paying for…"}
        </p>
      )}

      {result && phase === "done" && (
        <div className="flex flex-col gap-3 border-t border-hairline pt-4">
          <div>
            <div className="eyebrow mb-1">Answer</div>
            <p className="text-[15px] leading-relaxed text-hi">{result.answer}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[10px] border border-hairline bg-surface-1 p-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: "var(--settled)" }}>
              <ReceiptText className="size-3.5" /> receipt
            </span>
            <span className="font-mono text-mid">
              you paid <AmountMono value={result.citation.formattedAmount} size="sm" tone="settled" dimDecimals />{" "}
              → {result.citation.author ?? result.citation.name}
            </span>
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-steel hover:underline"
            >
              on-chain tx <ArrowUpRight className="size-3" />
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
