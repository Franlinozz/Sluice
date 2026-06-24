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

// ── Phase 2: the buyer agent ─────────────────────────────────────────────────
export const RUN_STATUS = ["running", "paused", "completed", "failed"] as const;
export type RunStatus = (typeof RUN_STATUS)[number];

export const DECISION_KINDS = ["pay", "skip", "capped"] as const;
export type DecisionKind = (typeof DECISION_KINDS)[number];

/** A configured buyer agent: a task, a budget, and an enforceable policy. */
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** The research/task description the agent reasons about. */
  task: text("task").notNull(),
  /** Per-run budget in 6-dp USDC base units (string). */
  budget: text("budget").notNull(),
  /** Plain-English spend policy. */
  policy: text("policy"),
  /** Parsed, enforceable rules (JSON): priceCeiling, allowedUnitTypes, topics, relevanceThreshold. */
  rules: text("rules"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** A single autonomous session. */
export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    status: text("status").$type<RunStatus>().notNull().default("running"),
    /** Spent so far (base units). */
    spent: text("spent").notNull().default("0"),
    /** Value acquired = sum of relevance of paid resources (0..N), stored as real. */
    value: integer("value").notNull().default(0),
    /** Steps (resources evaluated). */
    steps: integer("steps").notNull().default(0),
    /** "live" or "mock" reasoning. */
    mode: text("mode").notNull().default("mock"),
    note: text("note"),
    startedAt: integer("started_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("runs_agent").on(t.agentId)],
);

/** One reasoning step / decision in a run (the visible trace). */
export const decisions = sqliteTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id),
    resourceId: text("resource_id"),
    resourceName: text("resource_name").notNull(),
    decision: text("decision").$type<DecisionKind>().notNull(),
    /** 0..100 relevance (int) for tabular display. */
    relevance: integer("relevance").notNull().default(0),
    reason: text("reason").notNull(),
    /** Amount paid (base units) if decision = pay. */
    amount: text("amount"),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
    /** Accrual/nonce reference for the payment, if paid. */
    paymentRef: text("payment_ref"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("decisions_run").on(t.runId)],
);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type Decision = typeof decisions.$inferSelect;

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type Accrual = typeof accruals.$inferSelect;
export type NewAccrual = typeof accruals.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
