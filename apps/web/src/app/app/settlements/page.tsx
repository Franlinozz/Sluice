import { ReceiptText } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";

export const metadata = { title: "Settlements · Explorer" };

export default function SettlementsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Settlements · Explorer"
        title="Settlement Explorer"
        description="Every batch, every receipt — resource, units, rate, batch tx — each linked to Arcscan. This is the trust surface: don't trust the numbers, verify them."
      />
      <EmptyState
        icon={ReceiptText}
        title="No batches settled yet"
        description="As the Meter accrues and Circle Gateway settles batches on Arc, verifiable receipts land here with on-chain links. States are honest: authorized → batching → settled."
      />
    </div>
  );
}
