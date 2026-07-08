import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Card, Pill } from "@sluice/ui";
import { SiteHeader } from "@/components/marketing/site-header";
import { ProviderBadge } from "@/components/people/provider-badge";
import { sanitizeLabel } from "@/lib/sanitize";

export const metadata = {
  title: "Traction",
  description: "The honest scoreboard — every number clickable through to its proof.",
};
export const dynamic = "force-dynamic";

const BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Stats {
  generatedAt: string;
  distinctHumans: number;
  distinctPayingWallets: number;
  creatorsEarning: number;
  signinMediums: { provider: string; count: number }[];
  settlements: number;
  formattedTotalSettled: string;
  settlementsByDay: { day: string; count: number; amount: string }[];
  latestReceipts: { id: string; resourceName: string | null; formattedAmount: string; unitType: string; settledAt: string | null }[];
  notes: string[];
}
interface Partner {
  resourceId: string;
  name: string;
  team: string;
  endpointUrl: string;
  probedScheme: string | null;
  createdAt: string;
}

export default async function TractionPage() {
  const [stats, partners] = await Promise.all([
    fetch(`${BASE}/stats`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Stats>) : null)).catch(() => null),
    fetch(`${BASE}/partners`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Partner[]>) : [])).catch(() => [] as Partner[]),
  ]);

  const days = stats?.settlementsByDay ?? [];
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const figures = stats
    ? [
        { label: "Distinct humans", value: String(stats.distinctHumans), href: "/community", note: "profiles — linked wallets count once" },
        { label: "Paying wallets (clustered)", value: String(stats.distinctPayingWallets), href: "/app/settlements", note: "same-human wallets collapse" },
        { label: "Creators earning", value: String(stats.creatorsEarning), href: "/app/settlements", note: "distinct paid recipients" },
        { label: "Settlements", value: String(stats.settlements), href: "/app/settlements", note: "settled receipts" },
        { label: "Total settled", value: stats.formattedTotalSettled, href: "/app/settlements", note: "USDC on Arc" },
      ]
    : [];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <p className="eyebrow">Traction · the honest scoreboard</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-hi sm:text-4xl">
          Every number here has a receipt.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mid">
          Conservative by construction: humans are profiles (one per person, however many wallets),
          and every figure clicks through to its proof. Machine-readable at{" "}
          <a href="/api/stats" className="font-mono text-steel hover:underline">
            /api/stats
          </a>
          .
        </p>

        {!stats ? (
          <Card className="mt-8 p-8 text-center text-sm text-mid">Stats API unreachable.</Card>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {figures.map((f) => (
                <Link key={f.label} href={f.href} className="group">
                  <Card className="h-full p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-[11px] uppercase tracking-wide text-low">{f.label}</div>
                      <ArrowUpRight className="size-3 text-low opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="mt-1.5 font-mono text-xl tnum text-hi">{f.value}</div>
                    <div className="mt-1 text-[11px] leading-snug text-low">{f.note}</div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* how the humans actually signed in — real captured mediums (rule 16) */}
            {stats.signinMediums.some((m) => m.provider !== "unknown") && (
              <Card className="mt-6 p-5">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-hi">Signed in via</span>
                  <span className="text-xs text-low">real logins, one per human</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {stats.signinMediums
                    .filter((m) => m.provider !== "unknown")
                    .map((m) => (
                      <span
                        key={m.provider}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-1/60 px-2.5 py-1"
                      >
                        <ProviderBadge provider={m.provider} showLabel />
                        <span className="font-mono text-xs tnum text-hi">{m.count}</span>
                      </span>
                    ))}
                  {stats.signinMediums
                    .filter((m) => m.provider === "unknown")
                    .map((m) => (
                      <span key="unknown" className="text-[11px] text-low">
                        + {m.count} joined before sign-in capture
                      </span>
                    ))}
                </div>
                <p className="mt-3 text-[11px] leading-snug text-low">
                  Captured from the wallet/social provider each person actually used — not inferred.
                  Different mediums (wallet, Google, X, Discord, GitHub, Apple) all settle here.
                </p>
              </Card>
            )}

            {/* settlements over time — inline SVG, real daily counts */}
            <Card className="mt-6 p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm font-medium text-hi">Settlements over time</span>
                <span className="text-xs text-low">{days.length} active day{days.length === 1 ? "" : "s"}</span>
              </div>
              {days.length === 0 ? (
                <p className="text-sm text-low">No settled days yet.</p>
              ) : (
                <div className="flex h-28 items-end gap-1">
                  {days.map((d) => (
                    <div key={d.day} className="group relative flex-1">
                      <div
                        className="w-full rounded-t-[3px] bg-steel/60 transition-colors group-hover:bg-[var(--flow)]"
                        style={{ height: `${Math.max(6, (d.count / maxCount) * 100)}px` }}
                        title={`${d.day}: ${d.count} settlement${d.count === 1 ? "" : "s"}`}
                      />
                      <div className="mt-1 truncate text-center font-mono text-[9px] text-low">
                        {d.day.slice(5)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <div className="mb-3 text-sm font-medium text-hi">Latest receipts</div>
                <div className="flex flex-col divide-y divide-hairline">
                  {stats.latestReceipts.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-xs text-mid">
                        {sanitizeLabel(r.resourceName ?? r.unitType.replace("per_", "per "), 44)}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-hi">{r.formattedAmount}</span>
                    </div>
                  ))}
                </div>
                <Link href="/app/settlements" className="mt-3 inline-flex items-center gap-1 text-xs text-steel hover:underline">
                  Open the full explorer <ArrowUpRight className="size-3" />
                </Link>
              </Card>

              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-medium text-hi">Cross-team partners</span>
                  <Pill tone="info" dot>
                    {partners.length}
                  </Pill>
                </div>
                {partners.length === 0 ? (
                  <p className="text-sm leading-relaxed text-mid">
                    Other teams can list their x402 endpoints on the Sluice Bazaar — and our agents
                    pay them for real.{" "}
                    <Link href="/docs/partners" className="text-steel hover:underline">
                      How to list yours →
                    </Link>
                  </p>
                ) : (
                  <div className="flex flex-col divide-y divide-hairline">
                    {partners.map((p) => (
                      <div key={p.resourceId} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-hi">{sanitizeLabel(p.name, 40)}</div>
                          <div className="text-[11px] text-low">by {sanitizeLabel(p.team, 24)} · x402 probed ✓</div>
                        </div>
                        <a href={p.endpointUrl} target="_blank" rel="noreferrer" className="shrink-0 text-steel hover:underline">
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="mt-8 flex flex-col gap-1.5">
              {stats.notes.map((n) => (
                <p key={n} className="flex items-start gap-1.5 text-xs leading-relaxed text-low">
                  <ShieldCheck className="mt-0.5 size-3 shrink-0 text-settled" /> {n}
                </p>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
