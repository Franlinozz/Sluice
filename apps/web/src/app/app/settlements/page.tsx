import { AlertTriangle, ArrowUpRight, ReceiptText } from "lucide-react";
import { AddressChip, AmountMono, Badge, Card, StatusPill } from "@sluice/ui";
import { explorerAddressUrl } from "@sluice/chain";
import { sluiceApi, type ReceiptDTO } from "@/lib/api";
import { sanitizeLabel } from "@/lib/sanitize";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { SettleButton } from "@/components/settlements/settle-button";
import { VerifyButton } from "@/components/settlements/verify-button";

export const metadata = { title: "Settlements · Explorer" };
export const dynamic = "force-dynamic";

function receiptName(r: ReceiptDTO, nameOf: Map<string, string>): string {
  return sanitizeLabel(r.resourceName ?? nameOf.get(r.resourceId) ?? "—", 60);
}

function SettlementAnchor({ r }: { r: ReceiptDTO }) {
  return r.explorerUrl ? (
    <a
      href={r.explorerUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-steel hover:underline"
    >
      batch tx <ArrowUpRight className="size-3" />
    </a>
  ) : (
    <span className="text-xs text-low">
      Gateway-attested · {r.settlementRef.length} transfer{r.settlementRef.length === 1 ? "" : "s"}
    </span>
  );
}

export default async function SettlementsPage() {
  const [receipts, resources] = await Promise.all([sluiceApi.receipts(), sluiceApi.resources()]);
  const nameOf = new Map((resources ?? []).map((r) => [r.id, r.name]));

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <PageHeader
        eyebrow="Settlements · Explorer"
        title="Settlement Explorer"
        description="Every batch, every receipt — resource, units, rate, amount — with honest authorized → batching → settled states. Don't trust the numbers; verify them."
        actions={receipts && receipts.length > 0 ? <SettleButton /> : undefined}
      />

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
        <>
          {/* Mobile: card layout (tables don't survive 390px honestly) */}
          <div className="flex flex-col gap-3 md:hidden">
            {receipts.map((r, i) => (
              <Card
                key={r.id}
                className="flex flex-col gap-3 p-4 motion-safe:animate-[sluice-row-enter_0.4s_ease-out_both]"
                style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-hi">{receiptName(r, nameOf)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-low">
                      <span className="font-mono tnum">{r.units} ×</span>
                      <AmountMono value={r.formattedRate} size="sm" tone="mid" />
                      <Badge variant={r.backend === "gateway" ? "neutral" : "outline"}>{r.backend}</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <AmountMono value={r.formattedAmount} size="sm" dimDecimals />
                    <StatusPill status={r.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3">
                  <SettlementAnchor r={r} />
                  <VerifyButton receiptId={r.id} />
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: full table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left">
                    {["Resource", "Status", "Units", "Rate", "Amount", "Backend", "Payer", "Settlement", ""].map(
                      (h) => (
                        <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-low">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-b border-hairline last:border-0 hover:bg-surface-2/40 motion-safe:animate-[sluice-row-enter_0.4s_ease-out_both]"
                      style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                    >
                      <td className="max-w-[220px] truncate px-4 py-3 text-hi">{receiptName(r, nameOf)}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3 font-mono tnum text-mid">{r.units}</td>
                      <td className="px-4 py-3">
                        <AmountMono value={r.formattedRate} size="sm" tone="mid" />
                      </td>
                      <td className="px-4 py-3">
                        <AmountMono value={r.formattedAmount} size="sm" dimDecimals />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={r.backend === "gateway" ? "neutral" : "outline"}>{r.backend}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <AddressChip address={r.payer} href={explorerAddressUrl(r.payer)} chars={4} />
                      </td>
                      <td className="px-4 py-3">
                        <SettlementAnchor r={r} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <VerifyButton receiptId={r.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p className="text-xs leading-relaxed text-low">
        Circle Gateway settles nanopayments via a gas-free attested ledger; per-payment on-chain tx
        hashes aren&apos;t exposed. On-chain anchors are the buyer&apos;s deposit and the seller&apos;s
        withdrawal (see Treasury). Settled receipts mean Circle confirmed the transfer; balances move accordingly.
      </p>
    </div>
  );
}
