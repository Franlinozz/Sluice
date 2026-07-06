"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowUpRight, ReceiptText, Search, Sparkles } from "lucide-react";
import { AddressChip, AmountMono, Badge, Button, Card, cn, CountUp, PulseDot, Skeleton } from "@sluice/ui";
import { runResearchAction } from "@/lib/actions";
import type { ResearchResultDTO } from "@/lib/api";

const SAMPLES = [
  "How do AI agents pay creators per citation on Arc?",
  "What is x402 and how does Circle Gateway settle nanopayments?",
];

export function AskBox() {
  const [pending, start] = React.useTransition();
  const [q, setQ] = React.useState("");
  const [result, setResult] = React.useState<ResearchResultDTO | null>(null);

  const ask = (question: string) => {
    if (!question.trim()) return;
    start(async () => {
      const res = await runResearchAction(question.trim(), localStorage.getItem("sluice-profile-id") ?? undefined);
      if (!res.ok) {
        toast.error("Research failed", { description: res.error });
        return;
      }
      setResult(res.data!);
      try {
        localStorage.setItem("sluice-asked", "1"); // first-run checklist: real action, honestly tracked per browser
      } catch {}
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5" data-tour="ask">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-edge bg-surface-1 px-3">
            <Search className="size-4 text-low" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question — the agent pays each source it cites…"
              className="h-11 w-full bg-transparent text-sm text-hi outline-none placeholder:text-low"
            />
          </div>
          <Button type="submit" size="lg" disabled={pending || !q.trim()}>
            <Sparkles className="size-4" />
            {pending ? "Reasoning + paying…" : "Ask"}
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQ(s);
                ask(s);
              }}
              disabled={pending}
              className="rounded-pill border border-hairline bg-surface-1 px-3 py-1 text-xs text-mid transition-colors hover:border-edge hover:text-hi"
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {pending && (
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm text-mid">
            <PulseDot active />
            Reasoning over registered sources — paying the per-citation toll to each one it grounds
            in (real USDC on Arc)…
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-4/5" />
          </div>
        </Card>
      )}

      {result && !pending && (
        <Card className="p-6">
          <div className="eyebrow mb-2">Answer</div>
          <p className="text-[15px] leading-relaxed text-hi">{result.answer}</p>

          <div className="mt-5 flex items-center justify-between">
            <div className="eyebrow">
              Citations · each is a real settlement ({result.mode})
            </div>
            <span className="text-xs text-low">
              total paid{" "}
              <CountUp
                value={Number(result.totalPaid) / 1e6}
                prefix="$"
                decimals={6}
                className="text-hi"
              />
            </span>
          </div>

          {result.citations.length === 0 ? (
            <p className="mt-3 text-sm text-low">
              No registered sources were relevant enough to ground (and pay for) an answer.
            </p>
          ) : (
            <ol className="mt-3 flex flex-col gap-3">
              {result.citations.map((c, ci) => (
                <li
                  key={c.marker}
                  className="rounded-[10px] border border-hairline bg-surface-1 p-4 motion-safe:animate-[sluice-row-enter_0.4s_ease-out_both]"
                  style={{ animationDelay: `${ci * 160}ms` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-full bg-surface-3 font-mono text-[11px] text-hi">
                        {c.marker}
                      </span>
                      <span className="text-sm font-medium text-hi">{c.resourceName}</span>
                      <Badge variant={c.settlementType === "onchain" ? "signal" : "neutral"}>
                        {c.settlementType === "onchain" ? "on-chain split" : "gateway"}
                      </Badge>
                    </div>
                    <AmountMono value={c.formattedAmount} size="sm" tone="settled" dimDecimals />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-low">
                    {c.author && <span>by {c.author}</span>}
                    {c.sourceUrl && (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-steel hover:underline"
                      >
                        source <ArrowUpRight className="size-3" />
                      </a>
                    )}
                    {c.explorerUrl && (
                      <a
                        href={c.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-steel hover:underline"
                      >
                        settlement tx <ArrowUpRight className="size-3" />
                      </a>
                    )}
                  </div>
                  {c.splits && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.splits.map((s) => (
                        <span
                          key={s.wallet}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface-2 px-2 py-1 text-xs",
                          )}
                        >
                          <span className="text-mid">
                            {s.label} {s.pct}%
                          </span>
                          <AddressChip address={s.wallet} chars={3} />
                        </span>
                      ))}
                    </div>
                  )}
                  {/* the receipt: this citation IS a settlement — show its proof inline */}
                  <div
                    className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline pt-2.5 text-xs motion-safe:animate-[sluice-pop_0.4s_ease-out_both]"
                    style={{ animationDelay: `${450 + ci * 180}ms` }}
                  >
                    <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: "var(--settled)" }}>
                      <ReceiptText className="size-3.5" /> receipt
                    </span>
                    <span className="font-mono text-mid">
                      paid {c.formattedAmount} → {c.author ?? c.resourceName}
                    </span>
                    {c.explorerUrl ? (
                      <a href={c.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-steel hover:underline">
                        on-chain tx <ArrowUpRight className="size-3" />
                      </a>
                    ) : (
                      <a href="/app/settlements" className="inline-flex items-center gap-0.5 text-steel hover:underline">
                        Gateway-attested · view in Settlements <ArrowUpRight className="size-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs leading-relaxed text-low">
            Auditable by construction: the agent can only cite a source it paid the toll to retrieve,
            so every citation above is a real on-chain/Gateway settlement to that source&apos;s author.
          </p>
        </Card>
      )}
    </div>
  );
}
