import Link from "next/link";
import { ArrowUpRight, BookOpen, Coins, ReceiptText } from "lucide-react";
import { AmountMono, Button, Card, StatusPill, Stepper } from "@sluice/ui";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { NetworkHealth } from "@/components/overview/network-health";

export const dynamic = "force-dynamic";

const FLOW = [
  { label: "Deposit USDC into the Gateway Wallet", description: "One-time, per paying wallet." },
  { label: "Meter accrues per unit", description: "Per read, second, citation, listen, or call." },
  { label: "Gateway settles the batch on Arc", description: "Gas-free, attested; sub-second finality." },
  { label: "Withdraw cross-chain", description: "USDC / EURC via App Kit." },
];

export default async function OverviewPage() {
  const [kpis, receipts] = await Promise.all([sluiceApi.kpis(), sluiceApi.resources().then(() => sluiceApi.receipts())]);

  const tiles = [
    { label: "Total settled", value: kpis?.formattedTotalSettled ?? "$0.00", sub: "settled on Arc" },
    { label: "Units metered", value: kpis ? String(kpis.unitsMetered) : "0", sub: "across all resources" },
    { label: "Resources", value: kpis ? String(kpis.resources) : "0", sub: "registered & priced" },
    { label: "Settlements", value: kpis ? String(kpis.settlements) : "0", sub: "settled batches" },
  ];
  const recent = (receipts ?? []).slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <PageHeader
        eyebrow="Overview"
        title="Workspace"
        description="Every figure here traces to a real on-chain event or DB record — nothing is mocked. Numbers update live as agents pay creators."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <div className="eyebrow">{t.label}</div>
            <div className="mt-2 font-mono text-2xl tracking-tight tnum text-hi">{t.value}</div>
            <div className="mt-1 text-xs text-low">{t.sub}</div>
          </Card>
        ))}
      </div>

      {kpis && Number(kpis.batchingAmount) > 0 && (
        <div className="flex items-center gap-2 rounded-card border border-hairline bg-surface-1 px-4 py-3 text-sm">
          <StatusPill status="batching" />
          <span className="text-mid">
            {kpis.formattedBatchingAmount} across {kpis.batching} batch
            {kpis.batching === 1 ? "" : "es"} settling on Circle Gateway…
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
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <StatusPill status={r.status} />
                    <span className="text-sm text-mid">
                      {r.units} {r.unitType.replace("per_", "")} · {r.backend}
                    </span>
                  </div>
                  <AmountMono value={r.formattedAmount} size="sm" dimDecimals />
                </div>
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
        <Card className="p-6">
          <Stepper steps={FLOW} current={-1} />
        </Card>
      </Section>
    </div>
  );
}
