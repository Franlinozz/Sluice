import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  Timer,
  Quote,
  Headphones,
  Eye,
  Webhook,
} from "lucide-react";
import { Button, Card, Horizon, Logo, LiveDot, Reveal } from "@sluice/ui";
import { arcConfig, explorerAddressUrl } from "@sluice/chain";
import { sluiceApi } from "@/lib/api";
import { SiteHeader } from "@/components/marketing/site-header";
import { HeroFlow } from "@/components/marketing/hero-flow";
import { LiveStats } from "@/components/marketing/live-stats";
import { EconomyViz } from "@/components/marketing/economy-viz";
import { VerifyReceipt, type VerifyReceiptData, type VerifyAnchor } from "@/components/marketing/verify-receipt";
import { AskBox } from "@/components/ask/ask-box";
import { EditorialMedia } from "@/components/media/editorial-media";

export const dynamic = "force-dynamic";

const UNITS = [
  { icon: BookOpen, label: "per read" },
  { icon: Timer, label: "per second" },
  { icon: Quote, label: "per citation" },
  { icon: Headphones, label: "per listen" },
  { icon: Eye, label: "per view" },
  { icon: Webhook, label: "per call" },
];

const STEPS = [
  {
    n: "01",
    title: "Register & price",
    body: "Wrap an article, feed, stream, endpoint, or API. Pick a unit and a price — down to a millionth of a dollar.",
  },
  {
    n: "02",
    title: "Agents meter & pay",
    body: "Buyer agents reason per resource, pay via x402, and accrue against a signed authorization. No dead air charged.",
  },
  {
    n: "03",
    title: "Gateway settles on Arc",
    body: "Circle Gateway batches the nanopayments and settles on Arc in USDC — gas-free, sub-second, verifiable.",
  },
];

export default async function LandingPage() {
  const [kpis, receipts, resources, contracts] = await Promise.all([
    sluiceApi.kpis(),
    sluiceApi.receipts(),
    sluiceApi.resources(),
    sluiceApi.contracts(),
  ]);

  const resList = (resources ?? []).map((r) => ({ id: r.id, name: r.name, payTo: r.payTo }));
  const nameById = new Map(resList.map((r) => [r.id, r.name] as const));

  const latest = (receipts ?? []).find((r) => r.status === "settled") ?? null;
  const verifyData: VerifyReceiptData | null = latest
    ? {
        resourceName: nameById.get(latest.resourceId) ?? "Resource",
        formattedAmount: latest.formattedAmount,
        units: latest.units,
        unitType: latest.unitType,
        settledAt: latest.settledAt,
        settlementRef: latest.settlementRef ?? [],
        backend: latest.backend,
      }
    : null;

  const anchors: VerifyAnchor[] = [
    { label: "Gateway Wallet", href: explorerAddressUrl(arcConfig.gatewayWallet) },
  ];
  if (contracts?.ready && contracts.contracts) {
    anchors.push({ label: "BondEscrow", href: contracts.contracts.bondEscrow.url });
    anchors.push({ label: "ReputationRegistry", href: contracts.contracts.reputationRegistry.url });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero: the logo itself, alive ─────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="relative isolate">
            {/* the metered rail, physical — an environmental backdrop for the copy only;
                masked to fade out entirely before the animated hero below */}
            <div aria-hidden className="hero-photo">
              <Image
                src="/media/editorial/landing/the-metered-rail-horizon.webp"
                alt=""
                fill
                sizes="100vw"
                draggable={false}
                className="object-cover object-center"
              />
              <div className="hero-photo-scrim" />
            </div>
            <div className="mx-auto max-w-4xl px-4 pb-10 pt-16 text-center sm:px-6 sm:pb-16 sm:pt-24">
            <p className="eyebrow">Arc · Circle · x402 · Gateway nanopayments</p>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.03] tracking-tight text-hi sm:text-6xl">
              Make the smallest unit sellable.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-mid sm:text-lg">
              A read, a second, a citation — metered and settled on Arc in USDC, for humans and
              machines alike.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/app/earn">
                  Start earning <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/app/spend">Run a paying agent</Link>
              </Button>
            </div>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-xs text-low">
              <ShieldCheck className="size-3.5 text-settled" />
              Live on Arc testnet · {kpis ? `$${(Number(kpis.totalSettled) / 1e6).toFixed(6)}` : "$0.00"} settled so
              far —{" "}
              <a
                href={arcConfig.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-steel hover:underline"
              >
                verify on Arcscan <ArrowUpRight className="size-3" />
              </a>
            </p>
            </div>
          </div>

          {/* the living schematic — value flows in, the gate meters it, receipts settle out */}
          <HeroFlow
            receipts={(receipts ?? [])
              .filter((r) => r.status === "settled")
              .slice(0, 8)
              .map((r) => ({ formattedAmount: r.formattedAmount, unitType: r.unitType }))}
            className="mt-2 h-[300px] w-full sm:h-[380px]"
          />
        </section>

        {/* ── Live REAL stats ──────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <LiveStats initial={kpis} />
        </section>

        <Horizon className="mx-auto mt-12 max-w-6xl" />

        {/* ── One meter, every unit ────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="eyebrow">One meter, every unit</p>
              <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight text-hi sm:text-3xl">
                If it can be counted, it can be paid for — per use.
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {UNITS.map((u, i) => (
                  <Reveal key={u.label} delay={i * 60}>
                    <div className="unit-tile flex flex-col items-center gap-3 rounded-card border border-hairline bg-surface-1/40 px-4 py-6 text-center">
                      <u.icon className="unit-icon size-6 text-steel" strokeWidth={1.25} />
                      <span className="font-mono text-xs text-mid">{u.label}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
            <Reveal delay={120}>
              <EditorialMedia
                src="/media/editorial/landing/metered-units-index.webp"
                alt="A desk of measurable things — a seconds ruler, a highlighted transcript, a call log, a waveform and a mechanical counter"
                variant="figure"
                aspect={4 / 3}
                darkOpacity={0.72}
                lightOpacity={0.9}
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </Reveal>
          </div>
        </section>

        {/* ── The citation toll, shown not told ────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-2">
            <p className="eyebrow">The citation toll — shown, not told</p>
            <h2 className="max-w-2xl font-display text-2xl font-semibold tracking-tight text-hi sm:text-3xl">
              Ask a research agent. Watch it pay each source it cites.
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-mid">
              Every answer below settles a real nanopayment to the creators it grounds on — a live
              citation toll on Arc. This is the same agent that runs the console.
            </p>
          </div>
          <div className="mt-8">
            <AskBox />
          </div>
        </section>

        <Horizon className="mx-auto max-w-6xl" />

        {/* ── Watch the economy ────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Watch the economy</p>
              <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight text-hi sm:text-3xl">
                Agents paying creators, in real time.
              </h2>
            </div>
            <span className="hidden items-center gap-2 text-xs text-low sm:flex">
              <LiveDot status="live" /> from real settlements
            </span>
          </div>
          <Reveal className="mt-8">
          <Card className="relative overflow-hidden p-0">
            <EditorialMedia
              src="/media/editorial/landing/creator-payout-routing.webp"
              alt=""
              variant="background"
              gradient="to-r"
              darkOpacity={0.22}
              lightOpacity={0.14}
              objectPosition="center 60%"
              className="hidden sm:block"
            />
            <EconomyViz receipts={receipts ?? []} resources={resList} className="relative h-[320px] w-full sm:h-[380px]" />
          </Card>
          </Reveal>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-low">
            <span>● left: paying agents</span>
            <span>● right: creators earning</span>
            <span>every pulse is a real settled payment</span>
          </div>
        </section>

        {/* ── Don't trust — verify ─────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="eyebrow">Don&apos;t trust the numbers — verify</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-hi sm:text-3xl">
                Every figure on this page is real and re-checkable.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-mid">
                No mock data, no vanity counters. The latest real settlement is shown with its Circle
                transfer ID, and the on-chain anchors are open on Arcscan for anyone to inspect.
              </p>
            </div>
            <Reveal delay={80}>
              <VerifyReceipt data={verifyData} anchors={anchors} />
            </Reveal>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="eyebrow">How it works</p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <Card className="relative h-full overflow-hidden p-6">
                  {s.n === "03" && (
                    <EditorialMedia
                      src="/media/editorial/shared/physical-payment-rails.webp"
                      alt=""
                      variant="background"
                      gradient="to-t"
                      darkOpacity={0.3}
                      lightOpacity={0.18}
                      objectPosition="center 40%"
                    />
                  )}
                  <div className="relative">
                    <div className="font-mono text-sm text-steel">{s.n}</div>
                    <h3 className="mt-3 font-display text-lg font-medium text-hi">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-mid">{s.body}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA band ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <Card className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-hi">
                The open toll booth for the long tail.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mid">
                RSL-compatible, but it actually settles. Creator-owned, no platform lock-in.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/app">
                Open the console <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-hairline">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <Logo />
            <p className="max-w-xs text-xs leading-relaxed text-low">
              The settlement layer for the agent-paid web. Settled on Arc in USDC via Circle Gateway.
            </p>
            <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-pill border border-hairline bg-surface-1 px-3 py-1 text-xs text-mid">
              <LiveDot status="live" /> Arc testnet · Live
            </span>
          </div>

          <FooterCol
            title="Product"
            links={[
              { label: "Console", href: "/app" },
              { label: "Bazaar", href: "/app/discover" },
              { label: "Streams", href: "/app/meter" },
              { label: "Treasury", href: "/app/treasury" },
            ]}
          />
          <FooterCol
            title="Developers"
            links={[
              { label: "Ask the agent", href: "/ask" },
              { label: "Docs", href: "/docs" },
              { label: "Run an agent", href: "/app/spend" },
              { label: "Earn", href: "/app/earn" },
            ]}
          />
          <FooterCol
            title="Trust"
            links={[
              { label: "Traction", href: "/traction" },
              { label: "Community", href: "/community" },
              { label: "Join (3 min)", href: "/join" },
              { label: "Whitepaper (PDF)", href: "/sluice-whitepaper.pdf", external: true },
              { label: "Arcscan", href: arcConfig.explorerUrl, external: true },
            ]}
          />
        </div>
        <div className="border-t border-hairline">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-low sm:flex-row sm:items-center sm:px-6">
            <span>Settled on Arc in USDC · Circle Gateway nanopayments · x402</span>
            <span className="flex items-center gap-3">
              <a href="https://x.com/sluiceflow" target="_blank" rel="noreferrer" className="text-mid hover:text-hi">
                @sluiceflow
              </a>
              <span>© {new Date().getFullYear()} Sluice</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium text-hi">{title}</div>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.label}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noreferrer" className="text-xs text-mid hover:text-hi">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-xs text-mid hover:text-hi">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
