import Link from "next/link";
import { AlertTriangle, Cpu, ShieldCheck, ShieldX, ShieldAlert, Star, ExternalLink } from "lucide-react";
import { AddressChip, Card, DataRow, Pill } from "@sluice/ui";
import { sluiceApi, type MatchDTO } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { Term } from "@/components/glossary";
import { AutoRefresh } from "@/components/auto-refresh";
import { ResolveButtons } from "@/components/bazaar/resolve-buttons";

export const metadata = { title: "Agents · Fleet & Reputation" };
export const dynamic = "force-dynamic";

const STATUS_META: Record<MatchDTO["status"], { tone: "info" | "failed" | "neutral"; label: string; Icon: typeof ShieldCheck }> = {
  active: { tone: "info", label: "Staked", Icon: ShieldCheck },
  slashed: { tone: "failed", label: "Slashed", Icon: ShieldX },
  released: { tone: "neutral", label: "Released", Icon: ShieldAlert },
};

export default async function AgentsPage() {
  const [matches, reputation, contracts] = await Promise.all([
    sluiceApi.matches(),
    sluiceApi.reputation(1),
    sluiceApi.contracts(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={15000} />
      <PageHeader
        eyebrow="Agents · Fleet & Reputation"
        title="Fleet & Reputation"
        description={
          <>
            Providers put real money behind their promises (a <Term k="bond">bond</Term>). Deliver
            and it comes back; fall short and the buyer is compensated — all of it on-chain.
          </>
        }
        actions={
          <Link
            href="/app/discover#broker"
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-signal px-4 text-sm font-medium text-signal-contrast hover:opacity-90"
          >
            Broker a match
          </Link>
        }
      />

      {/* Provider reputation summary */}
      {reputation && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="flex flex-col gap-4 p-6 lg:col-span-1">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[10px] border border-hairline bg-surface-2 text-steel">
                <Cpu className="size-5" />
              </span>
              <div>
                <div className="text-sm font-medium text-hi">Sluice Provider · agent #1</div>
                <div className="mt-0.5">
                  <AddressChip address={reputation.provider} chars={5} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow mb-1">Reliability</div>
                <div className="font-mono text-2xl text-hi">{reputation.reliabilityPct}%</div>
              </div>
              <div className="flex flex-col items-end">
                <span className="flex items-center gap-1 font-mono text-lg text-hi">
                  <Star className="size-4 text-signal" />
                  {reputation.feedbackAverage.toFixed(1)}
                </span>
                <span className="text-xs text-low">{reputation.feedbackCount} ratings</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <div className="eyebrow mb-3">On-chain bond ledger</div>
            <DataRow label="Total bonded" mono>
              ${reputation.formattedBonded}
            </DataRow>
            <DataRow label="Active (at risk now)" mono>
              ${reputation.formattedActive}
            </DataRow>
            <DataRow label="Released (delivered)" mono>
              ${reputation.formattedReleased}
            </DataRow>
            <DataRow label="Slashed (underdelivered)" mono>
              ${reputation.formattedSlashed}
            </DataRow>
            <DataRow label="Matches" mono>
              {reputation.matches} ({reputation.slashes} slashed)
            </DataRow>
          </Card>
        </div>
      )}

      {/* Match ledger */}
      <Section title="Matches" hint={matches ? `${matches.length} total` : undefined}>
        {matches === null ? (
          <EmptyState icon={AlertTriangle} title="API unreachable" description="The broker API isn't responding." />
        ) : matches.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No bonds posted yet"
            description="Broker a match in the Bazaar — the provider stakes real USDC behind the job, slashed on underdelivery."
            action={
              <Link href="/app/discover#broker" className="text-sm text-steel hover:underline">
                Broker a match →
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((m) => {
              const meta = STATUS_META[m.status];
              return (
                <Card key={m.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px] border border-hairline bg-surface-2"
                        style={{ color: meta.tone === "neutral" ? "var(--text-mid)" : `var(--${meta.tone})` }}
                      >
                        <meta.Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-hi">{m.need}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-low">
                          <span className="font-mono">{m.matchIdShort}</span>
                          {m.reason && <span className="text-mid">· {m.reason}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-mono text-base text-hi">${m.formattedAmount}</span>
                      <Pill tone={meta.tone} dot>
                        {meta.label}
                      </Pill>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <TxLink label="Bond" href={m.postTxUrl} />
                      <TxLink label={m.status === "slashed" ? "Slash" : "Release"} href={m.resolveTxUrl} />
                      <TxLink label="Feedback" href={m.feedbackTxUrl} />
                    </div>
                    {m.status === "active" && <ResolveButtons matchId={m.id} />}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {contracts?.ready && contracts.contracts && (
        <Section title="Contracts" hint="Verified on Arcscan">
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
            {[
              { label: "Identity", c: contracts.contracts.identityRegistry },
              { label: "Reputation", c: contracts.contracts.reputationRegistry },
              { label: "BondEscrow", c: contracts.contracts.bondEscrow },
            ].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-mid">{label}</span>
                <AddressChip address={c.address} href={c.url} chars={4} />
              </div>
            ))}
          </Card>
        </Section>
      )}
    </div>
  );
}

function TxLink({ label, href }: { label: string; href: string | null }) {
  if (!href) return <span className="text-low">{label}: —</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-steel hover:underline">
      {label} <ExternalLink className="size-3" />
    </a>
  );
}
