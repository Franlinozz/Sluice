import { AlertTriangle, ShieldQuestion, Users, ExternalLink } from "lucide-react";
import { AddressChip, Card, Pill } from "@sluice/ui";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { TipForm, SettleButton } from "@/components/funding/funding-actions";

export const metadata = { title: "Funding · Quadratic pool" };
export const dynamic = "force-dynamic";

export default async function FundingPage() {
  const f = await sluiceApi.funding();
  const ready = f?.ready;
  const creators = f?.creators ?? [];
  const maxMatch = Math.max(1, ...creators.map((c) => Number(c.match)));
  const hasMatches = creators.some((c) => Number(c.match) > 0);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={20000} />
      <PageHeader
        eyebrow="Funding · Quadratic matching"
        title="Retroactive funding pool"
        description="The pool matches the breadth of support, not its size — many small tips beat one big one. Sub-cent matches sweep to a long tail of creators in a single on-chain transaction."
        actions={ready && f?.status === "open" ? <SettleButton disabled={!hasMatches} /> : undefined}
      />

      {!ready ? (
        <EmptyState
          icon={AlertTriangle}
          title="Funding pool not available"
          description="The FundingPool contract isn't deployed, or the API is unreachable."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <div className="eyebrow mb-2">Matching budget</div>
              <div className="font-mono text-2xl text-hi">${f!.pool!.formattedBalance}</div>
              <div className="mt-3 flex items-center gap-2 text-xs text-low">
                <Pill tone={f!.status === "settled" ? "settled" : "info"} dot>
                  round {f!.round} · {f!.status}
                </Pill>
                {f!.alpha != null && f!.alpha < 1 && <span>α {f!.alpha.toFixed(2)} (pool capped)</span>}
              </div>
              {f!.pool!.url && (
                <div className="mt-4">
                  <AddressChip address={f!.pool!.address!} href={f!.pool!.url} chars={5} />
                </div>
              )}
            </Card>
            <Card className="p-6 lg:col-span-2">
              <div className="eyebrow mb-2">How it works</div>
              <p className="text-sm leading-relaxed text-mid">
                For each creator the match is <span className="font-mono text-hi">(Σ√cᵢ)² − Σcᵢ</span> —
                the quadratic top-up over what was actually tipped, scaled to the pool. A creator
                backed by three $0.01 tips is matched far more than one backed by a single $0.03 tip,
                even though both raised the same amount. Settlement sweeps every match in one
                transaction, so sub-cent payouts across a long tail are viable.
              </p>
            </Card>
          </div>

          <Section title="This round" hint={`match total $${f!.formattedMatchTotal}`}>
            {creators.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No tips yet this round"
                description="Tip a creator below — each real on-chain tip counts toward the quadratic match."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {creators.map((c) => (
                  <Card key={c.creator} className="flex flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-hi">{c.label ?? "Creator"}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-low">
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3" /> {c.backers} backer{c.backers === 1 ? "" : "s"}
                          </span>
                          <span>raised ${c.formattedRaised}</span>
                          <AddressChip address={c.creator} chars={4} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-base text-hi">+${c.formattedMatch}</div>
                        <div className="text-xs text-low">matched → ${c.formattedTotal} total</div>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-signal"
                        style={{ width: `${Math.max(2, (Number(c.match) / maxMatch) * 100)}%` }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TipForm />
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2">
                <ShieldQuestion className="size-4 text-steel" />
                <span className="text-sm font-medium text-hi">Sybil resistance (honest limits)</span>
              </div>
              <p className="text-sm leading-relaxed text-mid">
                Each backer&apos;s contribution is weighted: a registered ERC-8004 identity counts
                full, while fresh, low-history wallets are discounted so a flood of empty sybil
                wallets can&apos;t cheaply inflate the match. This is a heuristic — real sybil
                resistance needs proof-of-personhood (Passport / BrightID-style), which is on the
                roadmap. We&apos;d rather ship the honest version than fake the guarantee.
              </p>
            </Card>
          </div>

          {(f!.history?.length ?? 0) > 0 && (
            <Section title="Settled rounds">
              <Card className="flex flex-col divide-y divide-hairline">
                {f!.history!.map((h) => (
                  <div key={h.round} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="text-sm text-hi">Round {h.round}</span>
                    <span className="font-mono text-sm text-mid">${h.formattedMatchTotal} matched</span>
                    {h.distributeTxUrl ? (
                      <a
                        href={h.distributeTxUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-steel hover:underline"
                      >
                        sweep tx <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-low">—</span>
                    )}
                  </div>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
