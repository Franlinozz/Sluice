/**
 * SQLite schema (Drizzle). Money is stored as 6-dp USDC base-unit STRINGS (bigint-safe,
 * never floats — CLAUDE.md #5/#9). Timestamps are unix-ms integers.
 */
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const UNIT_TYPES = [
  "per_request",
  "per_citation",
  "per_second",
  "per_byte",
  "per_token",
  "per_listen",
  "per_view",
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const ACCRUAL_STATUS = ["authorized", "batching", "settled", "failed"] as const;
export type AccrualStatus = (typeof ACCRUAL_STATUS)[number];

export const RECEIPT_STATUS = ["batching", "settled", "failed"] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUS)[number];

export const SETTLEMENT_BACKENDS = ["gateway", "direct"] as const;
export type SettlementBackendName = (typeof SETTLEMENT_BACKENDS)[number];

/** A priced, x402-protected resource. */
export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  unitType: text("unit_type").$type<UnitType>().notNull(),
  /** Price per unit in 6-dp USDC base units (string). */
  unitPrice: text("unit_price").notNull(),
  /** Seller address that receives settlement. */
  payTo: text("pay_to").notNull(),
  /** URL slug for the protected endpoint (unique). */
  path: text("path").notNull().unique(),
  status: text("status").notNull().default("active"),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * A verified-but-not-yet-settled unit of value (the Meter ledger). Holds the signed
 * EIP-3009 payload so the batch settler can settle it later.
 */
export const accruals = sqliteTable(
  "accruals",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    payer: text("payer").notNull(),
    unitType: text("unit_type").$type<UnitType>().notNull(),
    units: integer("units").notNull().default(1),
    /** Amount in 6-dp USDC base units (string). */
    amount: text("amount").notNull(),
    /** The verified x402 payment payload (JSON) — signed against the Gateway Wallet. */
    paymentPayload: text("payment_payload").notNull(),
    /** EIP-3009 nonce (hex) — unique per authorization; guards against replay/dupes. */
    nonce: text("nonce"),
    status: text("status").$type<AccrualStatus>().notNull().default("authorized"),
    receiptId: text("receipt_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    settledAt: integer("settled_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("accruals_payer_resource_status").on(t.payer, t.resourceId, t.status),
    index("accruals_nonce").on(t.nonce),
    index("accruals_receipt").on(t.receiptId),
  ],
);

/** A verifiable settlement receipt (the trust surface). */
export const receipts = sqliteTable(
  "receipts",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    payer: text("payer").notNull(),
    unitType: text("unit_type").$type<UnitType>().notNull(),
    units: integer("units").notNull(),
    /** Price per unit (base units). */
    rate: text("rate").notNull(),
    /** Total settled amount (base units). */
    grossAmount: text("gross_amount").notNull(),
    /** On-chain batch settlement tx hash (null until the batch lands on-chain). */
    batchTxHash: text("batch_tx_hash"),
    /** Circle Gateway transfer id(s) (JSON array) — settled async; reconciled to batchTxHash. */
    settlementRef: text("settlement_ref"),
    backend: text("backend").$type<SettlementBackendName>().notNull(),
    status: text("status").$type<ReceiptStatus>().notNull(),
    raw: text("raw"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    settledAt: integer("settled_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("receipts_created").on(t.createdAt),
    index("receipts_payer").on(t.payer),
    index("receipts_resource").on(t.resourceId),
  ],
);

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type Accrual = typeof accruals.$inferSelect;
export type NewAccrual = typeof accruals.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
