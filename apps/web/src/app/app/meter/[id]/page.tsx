import { AlertTriangle } from "lucide-react";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";
import { LiveMeter } from "@/components/meter/live-meter";

export const metadata = { title: "Live Meter" };
export const dynamic = "force-dynamic";

export default async function MeterSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await sluiceApi.session(id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Streams · Live Meter"
        title="Live session"
        description="Real per-second accrual (server-truth). Heartbeat confirms delivery; lose it and the meter auto-pauses — you're never charged for dead air."
      />
      {session ? (
        <LiveMeter initial={session} />
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="Session not found"
          description="This streaming session doesn't exist or the API is unreachable."
        />
      )}
    </div>
  );
}
