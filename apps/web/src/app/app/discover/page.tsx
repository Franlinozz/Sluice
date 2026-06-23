import { Compass } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";

export const metadata = { title: "Discover · Bazaar" };

export default function DiscoverPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Discover · Bazaar"
        title="Bazaar"
        description="Browse priced resources and agent services — reputation, prices, and bonds at a glance. The open marketplace for the agent-paid web."
      />
      <EmptyState
        icon={Compass}
        title="Nothing to discover yet"
        description="Once resources are registered, they're discoverable here (x402 Bazaar-style + the Sluice registry), so agents can find and price sources for their tasks."
      />
    </div>
  );
}
