import { AlertTriangle, ReceiptText } from "lucide-react";
import { Card } from "@sluice/ui";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";
import { EditorialMedia } from "@/components/media/editorial-media";
import { AutoRefresh } from "@/components/auto-refresh";
import { SettleButton } from "@/components/settlements/settle-button";
import { MarkReceiptsVisited } from "@/components/settlements/mark-visited";
import { SettlementsList } from "@/components/settlements/settlements-list";

export const metadata = { title: "Settlements · Explorer" };
export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const [receipts, resources] = await Promise.all([sluiceApi.receipts(), sluiceApi.resources()]);
  const names = Object.fromEntries((resources ?? []).map((r) => [r.id, r.name]));

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <MarkReceiptsVisited />
      <PageHeader
        eyebrow="Settlements · Explorer"
        title="Settlement Explorer"
        description="Every payment ever made here, with its receipt. Don't take our word for any of them — verify each one yourself."
        actions={receipts && receipts.length > 0 ? <SettleButton /> : undefined}
      />

      <Card className="grid grid-cols-1 overflow-hidden p-0 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <EditorialMedia
          src="/media/editorial/app/settlements/settlement-batching-packet.webp"
          alt="A case of tiny labeled metal units beside one consolidated settlement-batch envelope"
          variant="split"
          darkOpacity={0.72}
          lightOpacity={0.92}
          objectPosition="center 35%"
          sizes="(max-width: 768px) 100vw, 260px"
          className="min-h-36"
        />
        <div className="flex flex-col justify-center gap-1.5 p-5">
          <div className="font-display text-sm font-medium text-hi">How batching works</div>
          <p className="text-xs leading-relaxed text-mid">
            Tiny payments accumulate off-chain and settle together through Circle Gateway — that&apos;s
            why many nanopayments become a smaller number of settlements. Every individual receipt
            below stays traceable to its batch.
          </p>
        </div>
      </Card>

      {receipts === null ? (
        <EmptyState
          icon={AlertTriangle}
          title="API unreachable"
          description="The settlement API isn't responding. Start it with pnpm dev:api (or check the VPS service). No data is shown rather than fake data."
        />
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No batches settled yet"
          description="As the Meter accrues and Circle Gateway settles batches, verifiable receipts land here with on-chain anchors."
        />
      ) : (
        <SettlementsList receipts={receipts} names={names} />
      )}

      <p className="text-xs leading-relaxed text-low">
        Circle Gateway settles nanopayments via a gas-free attested ledger; per-payment on-chain tx
        hashes aren&apos;t exposed. On-chain anchors are the buyer&apos;s deposit and the seller&apos;s
        withdrawal (see Treasury). Settled receipts mean Circle confirmed the transfer; balances move accordingly.
      </p>
    </div>
  );
}
