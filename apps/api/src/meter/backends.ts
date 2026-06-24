/**
 * SettlementBackend — the Meter is decoupled from HOW value settles (CLAUDE.md #4).
 * - GatewayBatchedBackend (primary): settles a group of verified authorizations via Circle
 *   Gateway, which batches them on-chain (gas-free both sides).
 * - DirectX402Backend (fallback): settles each authorization immediately/sequentially via the
 *   same facilitator — no deferral/grouping. Switching is config only (SETTLEMENT_BACKEND).
 *
 * Both settle the SAME EIP-3009 payloads (signed against the Gateway Wallet); a fuller
 * direct on-chain transferWithAuthorization path is future work.
 */
import { settlePayment } from "../payments/facilitator.ts";
import type { PaymentPayload, PaymentRequirements } from "../payments/requirements.ts";
import type { SettlementBackendName } from "../db/schema.ts";

export interface SettleItem {
  id: string;
  payload: PaymentPayload;
  requirements: PaymentRequirements;
}

export interface PerItemResult {
  id: string;
  success: boolean;
  transaction?: string;
  error?: string;
}

export interface SettlementResult {
  settled: boolean;
  txHashes: string[];
  perItem: PerItemResult[];
  error?: string;
}

export interface SettlementBackend {
  readonly name: SettlementBackendName;
  settle(items: SettleItem[]): Promise<SettlementResult>;
}

const TRANSIENT = /(ECONNRESET|ETIMEDOUT|fetch failed|network|timeout|503|502|429)/i;

async function settleOne(item: SettleItem, attempts = 3): Promise<PerItemResult> {
  let lastErr = "";
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await settlePayment(item.payload, item.requirements);
      if (res.success) return { id: item.id, success: true, transaction: res.transaction };
      lastErr = res.errorReason ?? "settlement failed";
      // A definitive failure (e.g. invalid/replayed) won't fix on retry.
      if (!TRANSIENT.test(lastErr)) break;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      if (!TRANSIENT.test(lastErr)) break;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return { id: item.id, success: false, error: lastErr };
}

function summarize(perItem: PerItemResult[]): SettlementResult {
  const txHashes = [
    ...new Set(perItem.map((p) => p.transaction).filter((t): t is string => Boolean(t))),
  ];
  const settled = perItem.length > 0 && perItem.every((p) => p.success);
  return {
    settled,
    txHashes,
    perItem,
    error: settled ? undefined : perItem.find((p) => !p.success)?.error,
  };
}

/** Settle in small concurrent chunks so we don't trip Circle Gateway's rate limit. */
const SETTLE_CONCURRENCY = Number(process.env.SETTLE_CONCURRENCY ?? "4");

async function settleChunked(items: SettleItem[]): Promise<PerItemResult[]> {
  const out: PerItemResult[] = [];
  for (let i = 0; i < items.length; i += SETTLE_CONCURRENCY) {
    const chunk = items.slice(i, i + SETTLE_CONCURRENCY);
    out.push(...(await Promise.all(chunk.map((it) => settleOne(it)))));
    if (i + SETTLE_CONCURRENCY < items.length) await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}

class GatewayBatchedBackend implements SettlementBackend {
  readonly name = "gateway" as const;
  async settle(items: SettleItem[]): Promise<SettlementResult> {
    // Circle Gateway aggregates these into batched, gas-free on-chain settlement.
    return summarize(await settleChunked(items));
  }
}

class DirectX402Backend implements SettlementBackend {
  readonly name = "direct" as const;
  async settle(items: SettleItem[]): Promise<SettlementResult> {
    // Immediate, sequential, ungrouped settlement (the fallback path).
    const perItem: PerItemResult[] = [];
    for (const it of items) perItem.push(await settleOne(it));
    return summarize(perItem);
  }
}

export function getSettlementBackend(name?: string): SettlementBackend {
  const chosen = (name ?? process.env.SETTLEMENT_BACKEND ?? "gateway").toLowerCase();
  return chosen === "direct" ? new DirectX402Backend() : new GatewayBatchedBackend();
}
