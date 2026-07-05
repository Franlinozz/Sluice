"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AddressChip,
  AgentTrace,
  AmountMono,
  Badge,
  BondCard,
  Button,
  Card,
  DataRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  HelpTip,
  Horizon,
  Input,
  Label,
  LiveDot,
  Logo,
  LogoMark,
  MeterCard,
  NetworkBadge,
  Pill,
  ReceiptCard,
  Separator,
  Skeleton,
  Sparkline,
  StatusPill,
  Stepper,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  Reveal,
  CountUp,
  PulseDot,
  RowEnter,
  TickerDigits,
} from "@sluice/ui";
import { formatUSD, parseUSDC } from "@sluice/money";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="eyebrow">{title}</div>
      <Card className="p-6">{children}</Card>
    </section>
  );
}

const COLORS = [
  ["canvas", "--canvas"],
  ["surface-1", "--surface-1"],
  ["surface-2", "--surface-2"],
  ["surface-3", "--surface-3"],
  ["terminal", "--terminal"],
  ["edge", "--border-emphasis"],
  ["text-hi", "--text-hi"],
  ["text-mid", "--text-mid"],
  ["text-low", "--text-low"],
  ["signal", "--signal"],
  ["steel", "--steel"],
  ["flow", "--flow"],
  ["live", "--live"],
  ["settled", "--settled"],
  ["pending", "--pending"],
  ["failed", "--failed"],
  ["info", "--info"],
] as const;

const TRACE = [
  { kind: "thought" as const, title: "New task: ground answer on agent payments", detail: "Budget $0.50 · cap $0.01/source." },
  { kind: "tool" as const, title: "Searched registry + x402 Bazaar", detail: "6 candidate sources found." },
  { kind: "decision" as const, title: "Source A relevant (0.82) · price ok", detail: "0.82 relevance × $0.002 < value threshold." },
  { kind: "pay" as const, title: "Paid Source A", detail: "Authorized via Gateway; cited in answer.", amount: "$0.002" },
  { kind: "skip" as const, title: "Skipped Source D", detail: "Low relevance (0.21) for the price." },
];

export default function TokensPage() {
  const [checked, setChecked] = React.useState(true);
  const spark = [3, 5, 4, 7, 6, 9, 8, 12, 10, 14, 13, 18];

  return (
    <div className="flex flex-col gap-10 pb-20">
      <div>
        <div className="eyebrow mb-2">Dev · sign-off surface</div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-hi">
          Design system — every primitive, every state
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-mid">
          Not user-facing. The reference for the Graphite system before shipping features.
        </p>
      </div>

      <Group title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {COLORS.map(([name, varName]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div
                className="h-14 w-full rounded-md border border-hairline"
                style={{ backgroundColor: `var(${varName})` }}
              />
              <div className="font-mono text-[11px] text-mid">{name}</div>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Typography">
        <div className="flex flex-col gap-3">
          <div className="eyebrow">eyebrow · mono uppercase +0.12em</div>
          <p className="font-display text-4xl font-semibold tracking-tight text-hi">
            Display — Space Grotesk
          </p>
          <p className="font-sans text-base text-mid">
            UI sans — Inter. The quick brown fox settles 0.000001 USDC.
          </p>
          <p className="font-mono text-sm tnum text-mid">
            Mono — JetBrains · $0.000001 · 0x0077…19B9 · eip155:5042002
          </p>
        </div>
      </Group>

      <Group title="Buttons">
        <div className="flex flex-col gap-4">
          {(["signal", "secondary", "outline", "ghost", "danger", "link"] as const).map((v) => (
            <div key={v} className="flex flex-wrap items-center gap-3">
              <span className="w-20 font-mono text-xs text-low">{v}</span>
              <Button variant={v} size="sm">
                Small
              </Button>
              <Button variant={v}>Medium</Button>
              <Button variant={v} size="lg">
                Large
              </Button>
              <Button variant={v} disabled>
                Disabled
              </Button>
            </div>
          ))}
          <Separator />
          <div className="flex items-center gap-3">
            <HelpTip label="This control is disabled with a stated reason — never a silent no-op.">
              <span tabIndex={0}>
                <Button disabled>Disabled with reason (hover)</Button>
              </span>
            </HelpTip>
            <Button onClick={() => toast.success("Toast fired", { description: "Sonner is wired." })}>
              Fire a toast
            </Button>
          </div>
        </div>
      </Group>

      <Group title="Status pills & badges">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="authorized" />
            <StatusPill status="batching" />
            <StatusPill status="settled" />
            <StatusPill status="failed" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="settled" dot>
              settled
            </Pill>
            <Pill tone="pending" dot>
              pending
            </Pill>
            <Pill tone="failed" dot>
              failed
            </Pill>
            <Pill tone="info" dot>
              info
            </Pill>
            <Pill tone="neutral">neutral</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>neutral</Badge>
            <Badge variant="outline">outline</Badge>
            <Badge variant="solid">solid</Badge>
            <Badge variant="signal">signal</Badge>
          </div>
        </div>
      </Group>

      <Group title="Amounts (tabular mono)">
        <div className="flex flex-wrap items-end gap-6">
          <AmountMono value={formatUSD(parseUSDC("0.000001"))} size="sm" />
          <AmountMono value={formatUSD(parseUSDC("1.50"))} />
          <AmountMono value={formatUSD(parseUSDC("1234.5"))} size="lg" />
          <AmountMono value={formatUSD(parseUSDC("4210.42"))} size="2xl" dimDecimals />
          <AmountMono value={formatUSD(parseUSDC("12.00"))} size="lg" tone="settled" />
          <AmountMono value={formatUSD(parseUSDC("3.00"))} size="lg" tone="failed" />
        </div>
      </Group>

      <Group title="Network, live dots & addresses">
        <div className="flex flex-wrap items-center gap-4">
          <NetworkBadge name="Arc Testnet" status="live" />
          <NetworkBadge name="Arc Testnet" status="connecting" />
          <NetworkBadge name="Arc Testnet" status="down" />
          <span className="flex items-center gap-3">
            <LiveDot status="live" />
            <LiveDot status="connecting" />
            <LiveDot status="down" />
          </span>
          <AddressChip
            address="0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
            href="https://testnet.arcscan.app/address/0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
          />
        </div>
      </Group>

      <Group title="Inputs">
        <div className="grid max-w-md gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-price">Unit price (USDC)</Label>
            <Input id="t-price" placeholder="0.000001" />
          </div>
          <Input placeholder="Disabled" disabled />
          <div className="flex items-center gap-3">
            <Switch checked={checked} onCheckedChange={setChecked} id="t-switch" />
            <Label htmlFor="t-switch">Streaming meter {checked ? "on" : "off"}</Label>
          </div>
        </div>
      </Group>

      <Group title="Tabs, tooltip & dialog">
        <div className="flex flex-col gap-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="receipts">Receipts</TabsTrigger>
              <TabsTrigger value="disabled" disabled>
                Disabled
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-sm text-mid">Tab content — Overview.</p>
            </TabsContent>
            <TabsContent value="receipts">
              <p className="text-sm text-mid">Tab content — Receipts.</p>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Hover for tooltip
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settlement lag is real — states are honest.</TooltipContent>
            </Tooltip>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>One-time Gateway deposit</DialogTitle>
                  <DialogDescription>
                    A wallet must deposit USDC into the Gateway Wallet contract before it can make
                    nanopayments.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" size="sm">
                    Cancel
                  </Button>
                  <Button size="sm">Continue</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Group>

      <Group title="Stepper & sparkline">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Stepper
            current={1}
            steps={[
              { label: "Deposit USDC", description: "One-time into the Gateway Wallet." },
              { label: "Accrue per unit", description: "The Meter counts each unit." },
              { label: "Settle the batch", description: "Gateway settles on Arc." },
            ]}
          />
          <div className="flex items-center justify-center">
            <Sparkline data={spark} width={220} height={64} fill />
          </div>
        </div>
      </Group>

      <Group title="Skeletons">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Group>

      <Group title="Composite cards">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MeterCard
            title="RSSHub · Tech feed"
            unit="per citation"
            rate="$0.000001 / citation"
            accrued={formatUSD(parseUSDC("0.004210"))}
            status="batching"
            settlePct={64}
            sparkline={spark}
          />
          <ReceiptCard
            resource="Ghost · Essay #14"
            units="2,104"
            rate={formatUSD(parseUSDC("0.000001"))}
            amount={formatUSD(parseUSDC("0.002104"))}
            status="settled"
            txHash="0x9f12ab34cd56ef78ab90cd12ef34ab56cd78ef90ab12cd34ef56ab78cd90ef12"
            explorerHref="https://testnet.arcscan.app/tx/0x9f12ab34cd56ef78"
          />
          <ReceiptCard
            resource="API · /v1/quote"
            units="—"
            rate={formatUSD(parseUSDC("0.001"))}
            amount={formatUSD(parseUSDC("0.001"))}
            status="authorized"
          />
          <BondCard agent="broker-agent-01" amount={formatUSD(parseUSDC("5.00"))} status="staked" since="since block 1,204,553" />
          <BondCard agent="broker-agent-07" amount={formatUSD(parseUSDC("5.00"))} status="slashed" since="resolved · underdelivery" />
        </div>
      </Group>

      <Group title="Data rows">
        <div className="max-w-md">
          <DataRow label="Network">Arc Testnet</DataRow>
          <DataRow label="Chain ID" mono>
            5042002
          </DataRow>
          <DataRow label="Gateway Wallet">
            <AddressChip address="0x0077777d7EBA4688BDeF3E311b846F25870A19B9" chars={4} />
          </DataRow>
          <DataRow label="Rate" mono>
            {formatUSD(parseUSDC("0.000001"))} / unit
          </DataRow>
        </div>
      </Group>

      <Group title="Agent reasoning trace">
        <AgentTrace steps={TRACE} />
      </Group>

      <Group title="Motion (R2) — transform/opacity only, reduced-motion safe">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-8">
            <span className="inline-flex items-center gap-2 text-sm text-mid">
              <PulseDot active /> PulseDot (flow)
            </span>
            <span className="text-sm text-mid">
              CountUp: <CountUp value={706} className="text-hi" /> · <CountUp value={0.118356} prefix="$" decimals={6} className="text-hi" />
            </span>
            <span className="text-sm text-mid">
              TickerDigits: <TickerDigits value="$0.001234" className="text-hi" />
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {["settled · $0.001", "settled · $0.000002", "batching · $0.06"].map((t, i) => (
              <RowEnter key={t} index={i}>
                <div className="rounded-md border border-hairline bg-surface-1 px-3 py-2 text-xs text-mid">{t}</div>
              </RowEnter>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-24" />
            <span className="text-xs text-low">Skeleton shimmer</span>
          </div>
          <Reveal>
            <div className="rounded-card border border-hairline bg-surface-1 p-4 text-xs text-mid">
              Reveal: this block fades+rises when scrolled into view (static under reduced motion).
            </div>
          </Reveal>
          <p className="text-xs text-low">
            Also live: page-enter route transitions (template.tsx), pressable buttons (active scale
            0.98), card hover lift + flow glow, budget-bar/reserve-bar width transitions.
          </p>
        </div>
      </Group>

      <Group title="Brand & motif">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-8">
            <Logo />
            <LogoMark className={cn("size-9")} />
          </div>
          <Horizon />
        </div>
      </Group>
    </div>
  );
}
