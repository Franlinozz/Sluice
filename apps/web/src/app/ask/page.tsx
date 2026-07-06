import Link from "next/link";
import { ArrowUpRight, MessageCircleQuestion, ReceiptText, Search, Sparkles } from "lucide-react";
import { Card, Pill } from "@sluice/ui";
import { sluiceApi } from "@/lib/api";
import { sanitizeExcerpt } from "@/lib/sanitize";
import { SiteHeader } from "@/components/marketing/site-header";
import { AskBox } from "@/components/ask/ask-box";
import { AutoRefresh } from "@/components/auto-refresh";
import { EditorialMedia } from "@/components/media/editorial-media";

export const metadata = {
  title: "Ask the research agent",
  description:
    "Ask a question. The agent answers grounded in registered sources and pays each one it cites — real per-citation settlement on Arc.",
};
export const dynamic = "force-dynamic";

const HOW = [
  { Icon: Search, title: "You ask", body: "The agent looks only at sources whose authors priced them." },
  { Icon: Sparkles, title: "It pays to read", body: "Each source it uses gets a real USDC micro-payment on Arc." },
  { Icon: ReceiptText, title: "Every cite = a receipt", body: "Check any payment yourself in Settlements or on Arcscan." },
];

export default async function AskPage() {
  const recent = ((await sluiceApi.recentAnswers()) ?? []).filter((r) => r.citationCount > 0).slice(0, 6);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <AutoRefresh intervalMs={25000} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow">The citation toll · live</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-hi sm:text-4xl">
              Ask the research agent.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mid sm:text-base">
              It answers from sources whose authors put a price on them — and pays each one it cites,
              for real. Don&apos;t trust it; check every payment on{" "}
              <Link href="/app/settlements" className="text-steel hover:underline">
                Settlements
              </Link>{" "}
              or Arcscan.
            </p>
          </div>
          <EditorialMedia
            src="/media/editorial/ask/paid-citations-research-desk.webp"
            alt="A research desk at night — stacked, annotated source papers under a reading lamp"
            variant="figure"
            aspect={16 / 10}
            gradient="to-t"
            darkOpacity={0.6}
            lightOpacity={0.85}
            sizes="(max-width: 640px) 100vw, 300px"
            className="order-last sm:order-none"
          />
        </div>

        <div className="mt-8">
          <AskBox />
        </div>

        {/* how this works — three steps, no jargon */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {HOW.map((h) => (
            <div key={h.title} className="flex items-start gap-3 rounded-card border border-hairline bg-surface-1/40 p-4">
              <h.Icon className="mt-0.5 size-4 shrink-0 text-steel" />
              <div>
                <div className="text-sm font-medium text-hi">{h.title}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-mid">{h.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* the toll, as an object — every citation is a compensable event */}
        <Card className="mt-6 grid grid-cols-1 overflow-hidden p-0 sm:grid-cols-[240px_1fr]">
          <EditorialMedia
            src="/media/editorial/ask/citation-toll-access-pass.webp"
            alt="A vintage citation-toll pass with a brass verified seal, resting on classic texts"
            variant="split"
            darkOpacity={0.82}
            lightOpacity={0.95}
            objectPosition="center 45%"
            sizes="(max-width: 640px) 100vw, 240px"
            className="min-h-36"
          />
          <div className="flex flex-col justify-center gap-1.5 p-5">
            <div className="text-sm font-medium text-hi">Each citation creates a compensable event.</div>
            <p className="text-xs leading-relaxed text-mid">
              When the agent grounds an answer on a source, the retrieval itself is the payment —
              attribution and compensation in one auditable step: claim, source, payment, author.
            </p>
          </div>
        </Card>

        {/* recent answers — real questions, real paid citations */}
        <div className="mt-12">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-hi">Recent answers</h2>
            <span className="text-xs text-low">every citation below was actually paid</span>
          </div>

          {recent.length === 0 ? (
            <Card className="mt-3 flex flex-col items-center gap-2 p-8 text-center">
              <MessageCircleQuestion className="size-6 text-low" />
              <p className="text-sm text-mid">
                No paid answers yet — yours could be the first. Try one of the suggestions above.
              </p>
            </Card>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {recent.map((r, i) => (
                <Card
                  key={r.id}
                  className="flex flex-col gap-3 p-5 motion-safe:animate-[sluice-row-enter_0.4s_ease-out_both]"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-hi">“{sanitizeExcerpt(r.question, 110)}”</div>
                      <p className="mt-1.5 text-xs leading-relaxed text-mid">{sanitizeExcerpt(r.answer, 190)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-sm text-hi">{r.formattedTotalPaid}</span>
                      <span className="text-[11px] text-low">paid to sources</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline pt-2.5">
                    {r.citations.slice(0, 4).map((c, ci) => (
                      <span key={ci} className="inline-flex items-center gap-1.5 text-xs">
                        <Pill tone="settled" dot>
                          {c.formattedAmount}
                        </Pill>
                        <span className="max-w-[180px] truncate text-mid">{sanitizeExcerpt(c.resourceName, 40)}</span>
                        {c.explorerUrl ? (
                          <a href={c.explorerUrl} target="_blank" rel="noreferrer" className="text-steel hover:underline" aria-label="On-chain receipt">
                            <ArrowUpRight className="size-3" />
                          </a>
                        ) : (
                          <Link href="/app/settlements" className="text-steel hover:underline" aria-label="View in Settlements">
                            <ArrowUpRight className="size-3" />
                          </Link>
                        )}
                      </span>
                    ))}
                    <span className="ml-auto text-[11px] text-low">
                      {new Date(r.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
