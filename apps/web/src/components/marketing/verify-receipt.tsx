import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Card, Pill, PulseDot } from "@sluice/ui";
import { CopyRef } from "./copy-ref";

export interface VerifyAnchor {
  label: string;
  href: string;
}

export interface VerifyReceiptData {
  resourceName: string;
  formattedAmount: string;
  units: number;
  unitType: string;
  settledAt: string | null;
  settlementRef: string[];
  backend: string;
}

/**
 * "Don't trust the numbers — verify." Renders the most recent REAL settled receipt and the
 * artifacts anyone can re-check: the Circle Gateway transfer ID (gas-free attested settlement) and
 * the on-chain anchors on Arcscan. No claim here is unverifiable.
 */
export function VerifyReceipt({ data, anchors }: { data: VerifyReceiptData | null; anchors: VerifyAnchor[] }) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PulseDot active />
          <span className="text-sm font-medium text-hi">Latest settlement</span>
          <ShieldCheck className="size-4 text-settled" />
        </div>
        <Pill tone="settled" dot>
          settled
        </Pill>
      </div>

      {data ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs text-low">{data.resourceName}</div>
              {/* formattedAmount already includes the "$" (formatUSD) — never prefix another. */}
              <div className="mt-1 font-mono text-3xl tabular-nums text-hi">{data.formattedAmount}</div>
              <div className="mt-1 text-xs text-mid">
                {data.units.toLocaleString()} × {data.unitType.replace("per_", "per ")}
                {data.settledAt ? ` · ${new Date(data.settledAt).toLocaleString()}` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-low">via</div>
              <div className="text-sm text-mid">{data.backend === "gateway" ? "Circle Gateway" : data.backend}</div>
            </div>
          </div>

          {data.settlementRef[0] && (
            <div className="rounded-[10px] border border-hairline bg-surface-1 p-3">
              <div className="text-xs text-low">Circle Gateway transfer ID — re-checkable via the Gateway API</div>
              <div className="mt-1.5">
                <CopyRef value={data.settlementRef[0]} />
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-low">No settlements yet — the first real payment will appear here.</p>
      )}

      <div className="flex flex-col gap-2 border-t border-hairline pt-4">
        <div className="text-xs text-low">On-chain anchors — verify on Arcscan, no account needed:</div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {anchors.map((a) => (
            <a
              key={a.label}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-steel hover:underline"
            >
              {a.label} <ArrowUpRight className="size-3" />
            </a>
          ))}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-low">
          Gateway settles nanopayments gas-free via an attested ledger, so each payment carries a
          Circle transfer ID rather than its own gas-burning tx. Funds touch the chain at the deposit
          and the withdrawal — both visible above.
        </p>
      </div>
    </Card>
  );
}
