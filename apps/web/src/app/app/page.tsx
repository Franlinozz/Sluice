import Link from "next/link";
import { ArrowUpRight, BookOpen, Coins, ReceiptText } from "lucide-react";
import { AmountMono, Button, Card, RowEnter, StatusPill } from "@sluice/ui";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { NetworkHealth } from "@/components/overview/network-health";
import { KpiTiles } from "@/components/overview/kpi-tiles";
import { FirstRunChecklist } from "@/components/overview/first-run";
import { Term } from "@/components/glossary";

export const dynamic = "force-dynamic";

const FLOW = [
  { label: "Deposit once", description: "Put USDC into your spending balance (the Gateway)." },
  { label: "Use is counted", description: "Every read, second, or citation is metered as it happens." },
  { label: "Payments settle together", description: "Tiny payments are batched and settled on Arc — no gas per payment." },
  { label: "Withdraw anywhere", description: "Creators cash out to their wallet — on Arc instantly, or cross-chain." },
];

export default async function OverviewPage() {
  const [kpis, receipts] = await Promise.all([sluiceApi.kpis(), sluiceApi.resources().then(() => sluiceApi.receipts())]);

  const recent = (receipts ?? []).slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <PageHeader
        eyebrow="Overview"
        title="Workspace"
        description="What's been earned, paid, and settled — every number here is real and updates as it happens."
      />

      <FirstRunChecklist />

      <div data-tour="workspace">
        <KpiTiles kpis={kpis} />
      </div>

      {kpis && Number(kpis.batchingAmount) > 0 && (
        <div className="flex items-center gap-2 rounded-card border border-hairline bg-surface-1 px-4 py-3 text-sm">
          <StatusPill status="batching" />
          <span className="text-mid">
            {kpis.formattedBatchingAmount} across {kpis.batching} batch
            {kpis.batching === 1 ? "" : "es"} settling via <Term k="gateway">Circle Gateway</Term>…
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Live settlements" className="lg:col-span-2">
          {recent.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No settlements yet"
              description="When a metered resource is paid, authorized → batching → settled receipts appear here, each verifiable."
            />
          ) : (
            <Card className="divide-y divide-hairline p-0">
              {recent.map((r, i) => (
                <RowEnter key={r.id} index={i}>
                  <div className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <StatusPill status={r.status} />
                      <span className="text-sm text-mid">
                        {r.units} {r.unitType.replace("per_", "")} · {r.backend}
                      </span>
                    </div>
                    <AmountMono value={r.formattedAmount} size="sm" dimDecimals />
                  </div>
                </RowEnter>
              ))}
              <div className="px-5 py-3">
                <Link
                  href="/app/settlements"
                  className="inline-flex items-center gap-1 text-xs text-steel hover:underline"
                >
                  Open Settlement Explorer <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </Card>
          )}
        </Section>

        <div className="flex flex-col gap-6">
          <NetworkHealth />
          <Card className="p-5">
            <div className="eyebrow mb-3">Quick actions</div>
            <div className="flex flex-col gap-2">
              <Button asChild variant="secondary" size="sm" className="justify-start">
                <Link href="/app/earn">
                  <Coins className="size-4" /> Register a resource
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="justify-start">
                <Link href="/docs">
                  <BookOpen className="size-4" /> Read the docs
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Section title="How settlement works">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((f, i) => (
            <Card key={f.label} className="p-5">
              <MiniDiagram step={i} />
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-xs text-steel">0{i + 1}</span>
                <span className="text-sm font-medium text-hi">{f.label}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-mid">{f.description}</p>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}


/** Tiny line-art diagrams for the four settlement steps (deposit → meter → batch → withdraw). */
function MiniDiagram({ step }: { step: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 96 40" className="h-10 w-24 text-steel" aria-hidden>
      {step === 0 && (
        <>
          <path d="M14 20h30" {...common} />
          <path d="M38 14l7 6-7 6" {...common} />
          <rect x="56" y="8" width="26" height="24" rx="4" {...common} />
          <path d="M63 20h12M69 14v12" {...common} opacity="0.6" />
        </>
      )}
      {step === 1 && (
        <>
          <path d="M8 20h80" {...common} opacity="0.4" />
          {[22, 34, 46, 58, 70].map((x, i) => (
            <path key={x} d={`M${x} ${14 - (i % 2) * 2}v${12 + (i % 2) * 4}`} {...common} />
          ))}
        </>
      )}
      {step === 2 && (
        <>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={14 + i * 7} y={12 - i * 2} width="20" height="20" rx="3" {...common} opacity={0.35 + i * 0.3} />
          ))}
          <path d="M52 22h18" {...common} />
          <path d="M64 16l7 6-7 6" {...common} />
          <circle cx="84" cy="22" r="5" {...common} />
        </>
      )}
      {step === 3 && (
        <>
          <rect x="12" y="8" width="26" height="24" rx="4" {...common} />
          <path d="M46 20h28" {...common} />
          <path d="M68 14l7 6-7 6" {...common} />
          <circle cx="84" cy="8" r="3" {...common} opacity="0.5" />
          <circle cx="88" cy="32" r="3" {...common} opacity="0.5" />
        </>
      )}
    </svg>
  );
}
