import Link from "next/link";
import { AlertTriangle, Compass, ShieldCheck, BadgeCheck, Star } from "lucide-react";
import { AddressChip, Card, Pill } from "@sluice/ui";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { BazaarGrid } from "@/components/bazaar/bazaar-grid";
import { BrokerForm } from "@/components/bazaar/broker-form";

export const metadata = { title: "Discover · Bazaar" };
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [resources, reputation, contracts] = await Promise.all([
    sluiceApi.resources(),
    sluiceApi.reputation(1),
    sluiceApi.contracts(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Discover · Bazaar"
        title="Bazaar"
        description="Everything with a price on it, in one place. Hire providers who stake real money on delivering — reputation you can read as money, not stars."
      />

      {/* Verified contracts on Arcscan */}
      {contracts?.ready && contracts.contracts && (
        <Section title="On-chain registries" hint="Verified on Arcscan">
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
            {[
              { label: "Identity (ERC-8004)", c: contracts.contracts.identityRegistry },
              { label: "Reputation (ERC-8004)", c: contracts.contracts.reputationRegistry },
              { label: "BondEscrow", c: contracts.contracts.bondEscrow },
            ].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-settled" />
                <span className="text-xs text-mid">{label}</span>
                <AddressChip address={c.address} href={c.url} chars={4} />
              </div>
            ))}
          </Card>
        </Section>
      )}

      {/* Provider reputation glance */}
      {reputation && (
        <Section title="Featured provider" hint="Reputation = capital at risk">
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[10px] border border-hairline bg-surface-2 text-steel">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <div className="text-sm font-medium text-hi">Sluice Provider · agent #1</div>
                <div className="mt-0.5">
                  <AddressChip address={reputation.provider} chars={5} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Glance label="Bonded" value={`$${reputation.formattedBonded}`} />
              <Glance
                label="Slashed"
                value={`$${reputation.formattedSlashed}`}
                tone={reputation.slashes > 0 ? "failed" : undefined}
              />
              <Glance label="Reliability" value={`${reputation.reliabilityPct}%`} />
              <div className="flex flex-col">
                <span className="text-xs text-low">Feedback</span>
                <span className="flex items-center gap-1 font-mono text-sm text-hi">
                  <Star className="size-3.5 text-signal" />
                  {reputation.feedbackAverage.toFixed(1)}
                  <span className="text-low">({reputation.feedbackCount})</span>
                </span>
              </div>
              <Pill tone={reputation.slashes > 0 ? "pending" : "settled"} dot>
                {reputation.matches} match{reputation.matches === 1 ? "" : "es"}
              </Pill>
            </div>
          </Card>
        </Section>
      )}

      {/* Marketplace */}
      <Section title="Resources" hint={resources ? `${resources.length} listed` : undefined}>
        {resources === null ? (
          <EmptyState icon={AlertTriangle} title="API unreachable" description="The registry isn't responding." />
        ) : resources.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Nothing to discover yet"
            description="Register a resource in Creator Studio and it shows up here for agents to find and price."
            action={
              <Link href="/app/earn" className="text-sm text-steel hover:underline">
                Open Creator Studio →
              </Link>
            }
          />
        ) : (
          <BazaarGrid resources={resources} />
        )}
      </Section>

      {/* Broker a match */}
      <Section title="Hire with a bond" hint="ERC-8004 reputation bonds">
        <div id="broker" className="scroll-mt-24">
          <BrokerForm resources={(resources ?? []).map((r) => ({ id: r.id, name: r.name }))} />
        </div>
      </Section>
    </div>
  );
}

function Glance({ label, value, tone }: { label: string; value: string; tone?: "failed" }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-low">{label}</span>
      <span
        className="font-mono text-sm"
        style={{ color: tone === "failed" ? "var(--failed)" : "var(--text-hi)" }}
      >
        {value}
      </span>
    </div>
  );
}
