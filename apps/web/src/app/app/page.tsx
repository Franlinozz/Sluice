"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Coins, ReceiptText } from "lucide-react";
import {
  Button,
  Card,
  LiveDot,
  Stepper,
  cn,
} from "@sluice/ui";
import { arcConfig } from "@sluice/chain";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { useArcStatus } from "@/components/wallet/use-arc-status";

const KPIS = [
  { label: "Total settled", value: "$0.00", sub: "on-chain · Arc testnet" },
  { label: "Units metered", value: "0", sub: "across all resources" },
  { label: "Resources", value: "0", sub: "registered & priced" },
  { label: "Agents", value: "0", sub: "buyer + broker" },
];

const FLOW = [
  { label: "Deposit USDC into the Gateway Wallet", description: "One-time, per paying wallet." },
  { label: "Meter accrues per unit", description: "Per read, second, citation, listen, or call." },
  { label: "Gateway settles the batch on Arc", description: "Gas-free for both sides; sub-second finality." },
  { label: "Withdraw cross-chain", description: "USDC / EURC via App Kit." },
];

export default function OverviewPage() {
  const { status, blockNumber } = useArcStatus();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Overview"
        title="Workspace"
        description="Every figure here traces to a real on-chain event or DB record — nothing is mocked. As you register resources and run agents, this fills with live settlement data."
      />

      {/* KPI tiles — honest zero-state until activity begins */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="eyebrow">{k.label}</div>
            <div className="mt-2 font-mono text-2xl tracking-tight tnum text-hi">{k.value}</div>
            <div className="mt-1 text-xs text-low">{k.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Live settlements" className="lg:col-span-2">
          <EmptyState
            icon={ReceiptText}
            title="No settlements yet"
            description="When a metered resource is paid, authorized → batching → settled receipts appear here, each linkable on Arcscan. Don't trust the numbers — verify them."
          />
        </Section>

        <div className="flex flex-col gap-6">
          {/* Network health — real connectivity */}
          <Card className="p-5">
            <div className="eyebrow mb-3">Network health</div>
            <div className="flex items-center gap-2 text-sm text-hi">
              <LiveDot status={status} />
              Arc Testnet
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-low">Chain ID</dt>
                <dd className="font-mono text-mid">{arcConfig.chainId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-low">Latest block</dt>
                <dd className="font-mono text-mid">
                  {blockNumber != null ? blockNumber.toString() : "—"}
                </dd>
              </div>
            </dl>
            <a
              href={arcConfig.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs text-steel hover:underline"
            >
              Open Arcscan <ArrowUpRight className="size-3" />
            </a>
          </Card>

          {/* Quick actions — all navigate (no dead controls) */}
          <Card className="p-5">
            <div className="eyebrow mb-3">Quick actions</div>
            <div className="flex flex-col gap-2">
              <Button asChild variant="secondary" size="sm" className="justify-start">
                <Link href="/app/earn">
                  <Coins className="size-4" /> Start earning
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="justify-start">
                <Link href="/app/spend">
                  <ArrowUpRight className="size-4" /> Run a paying agent
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
