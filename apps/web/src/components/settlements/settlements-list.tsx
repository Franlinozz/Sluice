"use client";

import * as React from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AddressChip, AmountMono, Badge, Button, Card, StatusPill } from "@sluice/ui";
import { explorerAddressUrl } from "@sluice/chain";
import type { ReceiptDTO } from "@/lib/api";
import { sanitizeLabel } from "@/lib/sanitize";
import { VerifyButton } from "@/components/settlements/verify-button";

const PAGE_SIZE = 15;

function receiptName(r: ReceiptDTO, names: Record<string, string>): string {
  return sanitizeLabel(r.resourceName ?? names[r.resourceId] ?? "—", 60);
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

export function SettlementsList({
  receipts,
  names,
}: {
  receipts: ReceiptDTO[];
  names: Record<string, string>;
}) {
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(receipts.length / PAGE_SIZE));

  // If the list shrinks (rare, e.g. a refresh), keep the page in range.
  React.useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  const start = page * PAGE_SIZE;
  const shown = receipts.slice(start, start + PAGE_SIZE);
  const from = receipts.length === 0 ? 0 : start + 1;
  const to = Math.min(start + PAGE_SIZE, receipts.length);

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile: card layout (tables don't survive 390px honestly) */}
      <div className="flex flex-col gap-3 md:hidden">
        {shown.map((r, i) => (
          <Card
            key={r.id}
            className="flex flex-col gap-3 p-4 motion-safe:animate-[sluice-row-enter_0.4s_ease-out_both]"
            style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-hi">{receiptName(r, names)}</div>
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
      <Card className="hidden overflow-hidden p-0 md:block" data-tour="verify">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left">
                {["Resource", "Status", "Units", "Rate", "Amount", "Backend", "Payer", "Settlement", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-low">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-hairline last:border-0 hover:bg-surface-2/40 motion-safe:animate-[sluice-row-enter_0.4s_ease-out_both]"
                  style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                >
                  <td className="max-w-[220px] truncate px-4 py-3 text-hi">{receiptName(r, names)}</td>
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

      {/* Pager — only when it earns its place */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-low tnum">
            {from}–{to} of {receipts.length} receipts
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <span className="font-mono text-xs text-mid tnum">
              {page + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              aria-label="Next page"
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
