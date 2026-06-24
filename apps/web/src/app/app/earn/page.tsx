import { AlertTriangle, Coins } from "lucide-react";
import { AddressChip, Card } from "@sluice/ui";
import { explorerAddressUrl } from "@sluice/chain";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { RegisterForm } from "@/components/earn/register-form";

export const metadata = { title: "Earn · Creator Studio" };
export const dynamic = "force-dynamic";

export default async function EarnPage() {
  const resources = await sluiceApi.resources();

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={20000} />
      <PageHeader
        eyebrow="Earn · Creator Studio"
        title="Creator Studio"
        description="Register a resource, set a unit and price, and get a live x402-protected endpoint. Agents pay per use; you get paid per use, settled on Arc in USDC."
      />

      <RegisterForm />

      <Section title="Your resources" hint={resources ? `${resources.length} registered` : undefined}>
        {resources === null ? (
          <EmptyState
            icon={AlertTriangle}
            title="API unreachable"
            description="The registry API isn't responding. Start it with pnpm dev:api (or check the VPS service)."
          />
        ) : resources.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No resources yet"
            description="Register your first priced resource above to get a live x402-protected endpoint."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {resources.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-sm font-medium text-hi">{r.name}</div>
                    {r.description && <div className="mt-0.5 text-xs text-low">{r.description}</div>}
                  </div>
                  <span className="rounded-md border border-edge bg-surface-2 px-2 py-0.5 font-mono text-xs text-mid">
                    {r.rateLabel}
                  </span>
                </div>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-low">Endpoint</dt>
                    <dd className="font-mono text-mid">{r.endpoint}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-low">Pays to</dt>
                    <dd>
                      <AddressChip address={r.payTo} href={explorerAddressUrl(r.payTo)} chars={4} />
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
