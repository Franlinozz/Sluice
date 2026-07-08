/**
 * THE METER — unit-agnostic accrual engine. Verifies on request (resource served instantly),
 * accrues the signed authorization, and settles a batch on a trigger (threshold/timer/session).
 * Decoupled from the settlement backend (CLAUDE.md #4).
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { fromBaseUnitString, toBaseUnitString } from "@sluice/money";
import { db } from "../db/client.ts";
import {
  accruals,
  receipts,
  resources,
  type Accrual,
  type Receipt,
  type UnitType,
} from "../db/schema.ts";
import { buildRequirements, type PaymentPayload } from "../payments/requirements.ts";
import { extractTxHash, getTransfer, transferOutcome } from "../payments/transfers.ts";
import { getSettlementBackend, type SettleItem, type SettlementBackend } from "./backends.ts";
import { walletClusters } from "../people/profiles.ts";

/** Default batch trigger: settle once a payer's authorized accruals reach this amount (base units). */
export const SETTLE_THRESHOLD = BigInt(process.env.METER_SETTLE_THRESHOLD ?? "10000"); // $0.01
/** ...or this many authorized accruals, whichever first. */
export const SETTLE_MAX_ACCRUALS = Number(process.env.METER_SETTLE_MAX_ACCRUALS ?? "25");

export interface AccrueParams {
  resourceId: string;
  payer: string;
  unitType: UnitType;
  units: number;
  /** Amount authorized for this accrual (base units) = unitPrice × units. */
  amountBaseUnits: string;
  paymentPayload: PaymentPayload;
  nonce?: string;
}

export function accrue(p: AccrueParams): Accrual {
  // Idempotency: a re-used EIP-3009 nonce is a duplicate — return the existing accrual.
  if (p.nonce) {
    const existing = db.select().from(accruals).where(eq(accruals.nonce, p.nonce)).get();
    if (existing) return existing;
  }
  const id = randomUUID();
  db.insert(accruals)
    .values({
      id,
      resourceId: p.resourceId,
      payer: p.payer,
      unitType: p.unitType,
      units: p.units,
      amount: p.amountBaseUnits,
      paymentPayload: JSON.stringify(p.paymentPayload),
      nonce: p.nonce,
      status: "authorized",
    })
    .run();
  return db.select().from(accruals).where(eq(accruals.id, id)).get()!;
}

export function authorizedFor(resourceId: string, payer: string): Accrual[] {
  return db
    .select()
    .from(accruals)
    .where(
      and(
        eq(accruals.resourceId, resourceId),
        eq(accruals.payer, payer),
        eq(accruals.status, "authorized"),
      ),
    )
    .all();
}

export function authorizedTotal(resourceId: string, payer: string): bigint {
  return authorizedFor(resourceId, payer).reduce((acc, a) => acc + BigInt(a.amount), 0n);
}

/** Should we trigger a settlement for this payer/resource now? */
export function shouldSettle(resourceId: string, payer: string): boolean {
  const pending = authorizedFor(resourceId, payer);
  if (pending.length === 0) return false;
  const total = pending.reduce((acc, a) => acc + BigInt(a.amount), 0n);
  return total >= SETTLE_THRESHOLD || pending.length >= SETTLE_MAX_ACCRUALS;
}

/** Settle a single (resource, payer) group into ONE receipt. */
export async function batchSettlePayer(
  resourceId: string,
  payer: string,
  backend: SettlementBackend = getSettlementBackend(),
): Promise<Receipt | null> {
  const pending = authorizedFor(resourceId, payer);
  if (pending.length === 0) return null;
  const resource = db.select().from(resources).where(eq(resources.id, resourceId)).get();
  if (!resource) return null;

  const ids = pending.map((a) => a.id);
  db.update(accruals).set({ status: "batching" }).where(inArray(accruals.id, ids)).run();

  const items: SettleItem[] = pending.map((a) => ({
    id: a.id,
    payload: JSON.parse(a.paymentPayload) as PaymentPayload,
    requirements: buildRequirements(a.amount, resource.payTo),
  }));

  let result;
  try {
    result = await backend.settle(items);
  } catch (err) {
    // Backend blew up entirely — revert to authorized so a later trigger can retry.
    db.update(accruals).set({ status: "authorized" }).where(inArray(accruals.id, ids)).run();
    throw err;
  }

  const byId = new Map(result.perItem.map((p) => [p.id, p]));
  const settledAccruals = pending.filter((a) => byId.get(a.id)?.success);
  const failedAccruals = pending.filter((a) => !byId.get(a.id)?.success);

  const units = settledAccruals.reduce((acc, a) => acc + a.units, 0);
  const gross = settledAccruals.reduce((acc, a) => acc + BigInt(a.amount), 0n);
  const receiptId = randomUUID();

  if (settledAccruals.length > 0) {
    // result.txHashes are Circle transfer ids (settled async). Receipt starts "batching";
    // the reconciler resolves them to a real on-chain tx hash and flips it to "settled".
    db.insert(receipts)
      .values({
        id: receiptId,
        resourceId,
        payer,
        unitType: resource.unitType,
        units,
        rate: resource.unitPrice,
        grossAmount: toBaseUnitString(gross),
        batchTxHash: null,
        settlementRef: JSON.stringify(result.txHashes),
        backend: backend.name,
        status: "batching",
        raw: JSON.stringify({ transferIds: result.txHashes, perItem: result.perItem }),
        settledAt: null,
      })
      .run();
    db.update(accruals)
      .set({ status: "batching", receiptId })
      .where(
        inArray(
          accruals.id,
          settledAccruals.map((a) => a.id),
        ),
      )
      .run();
  }

  if (failedAccruals.length > 0) {
    db.update(accruals)
      .set({ status: "failed" })
      .where(
        inArray(
          accruals.id,
          failedAccruals.map((a) => a.id),
        ),
      )
      .run();
  }

  if (settledAccruals.length === 0) return null;
  return db.select().from(receipts).where(eq(receipts.id, receiptId)).get()!;
}

/** Settle every pending (resource, payer) group — used by the timer + session-end. */
export async function settleAllPending(
  backend: SettlementBackend = getSettlementBackend(),
): Promise<Receipt[]> {
  const groups = db
    .selectDistinct({ resourceId: accruals.resourceId, payer: accruals.payer })
    .from(accruals)
    .where(eq(accruals.status, "authorized"))
    .all();
  const out: Receipt[] = [];
  for (const g of groups) {
    const r = await batchSettlePayer(g.resourceId, g.payer, backend);
    if (r) out.push(r);
  }
  return out;
}

/**
 * Reconcile "batching" receipts: poll their Circle transfer ids and, once batched on-chain,
 * record the real tx hash and flip receipt + accruals to "settled" (CLAUDE.md #8 settlement lag).
 */
export async function reconcilePending(): Promise<number> {
  const pending = db.select().from(receipts).where(eq(receipts.status, "batching")).all();
  let updated = 0;
  for (const r of pending) {
    if (!r.settlementRef) continue;
    let refs: string[];
    try {
      refs = JSON.parse(r.settlementRef) as string[];
    } catch {
      continue;
    }
    if (refs.length === 0) continue;

    const outcomes: ("settled" | "failed" | "pending")[] = [];
    const hashes = new Set<string>();
    for (const ref of refs) {
      try {
        const t = await getTransfer(ref);
        if (!t) {
          outcomes.push("pending");
          continue;
        }
        outcomes.push(transferOutcome(t));
        const h = extractTxHash(t);
        if (h) hashes.add(h);
      } catch {
        outcomes.push("pending");
      }
    }

    if (outcomes.some((o) => o === "pending")) continue; // not all terminal yet
    const now = new Date();
    if (outcomes.some((o) => o === "failed")) {
      db.update(receipts).set({ status: "failed" }).where(eq(receipts.id, r.id)).run();
      db.update(accruals).set({ status: "failed" }).where(eq(accruals.receiptId, r.id)).run();
    } else {
      const onChain = [...hashes][0] ?? r.batchTxHash ?? null;
      db.update(receipts)
        .set({ status: "settled", batchTxHash: onChain, settledAt: now })
        .where(eq(receipts.id, r.id))
        .run();
      db.update(accruals)
        .set({ status: "settled", settledAt: now })
        .where(eq(accruals.receiptId, r.id))
        .run();
    }
    updated++;
  }
  return updated;
}

// ── Reads for the UI ─────────────────────────────────────────────────────────
export function listReceipts(limit = 100): Receipt[] {
  return db.select().from(receipts).orderBy(desc(receipts.createdAt)).limit(limit).all();
}

export function getReceipt(id: string): Receipt | undefined {
  return db.select().from(receipts).where(eq(receipts.id, id)).get();
}

export interface MeterAggregates {
  totalSettled: string; // base units (settled receipts only)
  batchingAmount: string; // base units in-flight (batching receipts)
  unitsMetered: number;
  resources: number;
  settlements: number;
  batching: number;
  payers: number;
  creatorsPaid: number;
  pendingAccruals: number;
}

export function aggregates(): MeterAggregates {
  const allReceipts = db.select().from(receipts).all();
  const settledReceipts = allReceipts.filter((r) => r.status === "settled");
  const batchingReceipts = allReceipts.filter((r) => r.status === "batching");
  const allAccruals = db.select().from(accruals).all();
  const totalSettled = settledReceipts.reduce((acc, r) => acc + BigInt(r.grossAmount), 0n);
  const batchingAmount = batchingReceipts.reduce((acc, r) => acc + BigInt(r.grossAmount), 0n);
  const unitsMetered = allAccruals.reduce((acc, a) => acc + a.units, 0);
  const payers = new Set(allAccruals.map((a) => a.payer)).size;
  const allResources = db.select().from(resources).all();
  const resById = new Map(allResources.map((r) => [r.id, r] as const));
  // Canonical creator count — MUST match computeStats().creatorsEarning (people/stats.ts) so the
  // landing "Creators earning" tile and the /traction scoreboard never disagree: cluster linked
  // wallets into one human (rule 16) and exclude archived resources from the headline (rule 15).
  const clusters = walletClusters();
  const clusterOf = (w: string) => clusters.get(w.toLowerCase()) ?? w.toLowerCase();
  const creatorsPaid = new Set(
    settledReceipts
      .map((r) => resById.get(r.resourceId))
      .filter((res): res is NonNullable<typeof res> => Boolean(res) && !res!.archived)
      .map((res) => clusterOf(res.payTo)),
  ).size;
  const pending = allAccruals.filter((a) => a.status === "authorized").length;
  return {
    totalSettled: toBaseUnitString(totalSettled),
    batchingAmount: toBaseUnitString(batchingAmount),
    unitsMetered,
    resources: allResources.length,
    settlements: settledReceipts.length,
    batching: batchingReceipts.length,
    payers,
    creatorsPaid,
    pendingAccruals: pending,
  };
}

export { fromBaseUnitString };
