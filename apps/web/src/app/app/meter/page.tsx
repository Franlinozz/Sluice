import Link from "next/link";
import { AlertTriangle, Radio } from "lucide-react";
import { Card } from "@sluice/ui";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";
import { Term } from "@/components/glossary";
import { StartStream } from "@/components/meter/start-stream";
import { sanitizeLabel } from "@/lib/sanitize";

export const metadata = { title: "Streams · Live Meter" };
export const dynamic = "force-dynamic";

export default async function MeterIndexPage() {
  const resources = await sluiceApi.resources();
  const streams = (resources ?? []).filter((r) => r.unitType === "per_second");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Streams · Live Meter"
        title="Streaming meter"
        description={
          <>
            Pay for streams by the second — and only while they&apos;re actually flowing (
            <Term k="proof-of-flow">proof of flow</Term>). Stop any time; you&apos;re never charged
            for dead air.
          </>
        }
      />

      {resources === null ? (
        <EmptyState icon={AlertTriangle} title="API unreachable" description="The API isn't responding." />
      ) : streams.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No streaming resources yet"
          description="Register a per_second resource in Creator Studio (set the unit to per_second) to start a live metering session."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {streams.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="font-display text-sm font-medium text-hi">{sanitizeLabel(r.name)}</div>
                <div className="mt-0.5 font-mono text-xs text-low">{r.formattedPrice}/sec</div>
              </div>
              <StartStream resourceId={r.id} />
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-low">
        Need a stream to meter?{" "}
        <Link href="/app/earn" className="text-steel hover:underline">
          Register a per_second resource
        </Link>
        .
      </p>
    </div>
  );
}
