import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Button, Card, Horizon, Logo } from "@sluice/ui";
import { arcConfig } from "@sluice/chain";
import { SiteHeader } from "@/components/marketing/site-header";
import { HeroMeter } from "@/components/marketing/hero-meter";

const UNITS = ["a read", "a second", "a citation", "a listen", "a view", "an API call"];

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

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="eyebrow">Arc · Circle · x402 · Gateway nanopayments</p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-hi sm:text-5xl lg:text-6xl">
              The settlement layer for the agent-paid web.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-mid sm:text-lg">
              Any unit of value — a read, a second, a citation, a listen, a call — metered and
              settled on Arc in USDC. Creators get paid per use. Agents pay per use, and decide for
              themselves.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/ask">
                  Ask the research agent <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/app/earn">Start earning</Link>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-1.5 text-xs text-low">
              <ShieldCheck className="size-3.5 text-settled" />
              Live on Arc testnet · $0.00 settled so far —{" "}
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

          {/* The sluice */}
          <div className="relative">
            <Card className="relative overflow-hidden">
              <div className="absolute left-5 top-5 z-10">
                <p className="eyebrow">the sluice</p>
              </div>
              <HeroMeter className="h-[340px] w-full sm:h-[400px]" />
              <div className="pointer-events-none absolute bottom-5 right-5 z-10 text-right">
                <p className="font-mono text-xs text-low">metered → gated → settled</p>
              </div>
            </Card>
          </div>
        </section>

        <Horizon className="mx-auto max-w-6xl" />

        {/* One meter, every unit */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="eyebrow">One meter, every unit</p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight text-hi sm:text-3xl">
            If it can be counted, it can be paid for — per use.
          </h2>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {UNITS.map((u) => (
              <span
                key={u}
                className="rounded-pill border border-edge bg-surface-1 px-4 py-2 font-mono text-sm text-mid"
              >
                {u}
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="eyebrow">How it works</p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <Card key={s.n} className="p-6">
                <div className="font-mono text-sm text-steel">{s.n}</div>
                <h3 className="mt-3 font-display text-lg font-medium text-hi">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mid">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA band */}
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

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <Logo />
          <p className="text-xs text-low">
            Settled on Arc in USDC · Circle Gateway nanopayments · x402
          </p>
          <div className="flex items-center gap-5 text-xs text-mid">
            <Link href="/app" className="hover:text-hi">
              Console
            </Link>
            <Link href="/docs" className="hover:text-hi">
              Docs
            </Link>
            <a href={arcConfig.explorerUrl} target="_blank" rel="noreferrer" className="hover:text-hi">
              Arcscan
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
