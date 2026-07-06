/**
 * SQLite schema (Drizzle). Money is stored as 6-dp USDC base-unit STRINGS (bigint-safe,
 * never floats — CLAUDE.md #5/#9). Timestamps are unix-ms integers.
 */
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const UNIT_TYPES = [
  "per_request",
  "per_citation",
  "per_read",
  "per_crawl",
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
  /** Who registered it (R5 attribution, opt-in display). */
  profileId: text("profile_id"),
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
  /**
   * Curation flag (Overhaul rule 15): archived resources disappear from Bazaar/Streams/Studio but
   * their RECEIPTS REMAIN in Settlements — settlement history is immutable, resources are not.
   */
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  metadata: text("metadata"),
  // Phase 3 (citation toll): content source + attribution splits.
  author: text("author"),
  contentUrl: text("content_url"),
  sourceType: text("source_type").default("url"), // url | feed_item | domain
  /** Attribution splits (JSON [{label,wallet,pct}]). Null/empty = single author (payTo). */
  splits: text("splits"),
  /** Deployed RoyaltySplitter address for multi-collaborator resources. */
  splitterAddress: text("splitter_address"),
  feedId: text("feed_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** An ingested RSS/Atom feed (RSSHub route or native) whose items become citable resources. */
export const feeds = sqliteTable("feeds", {
  id: text("id").primaryKey(),
  feedUrl: text("feed_url").notNull().unique(),
  title: text("title"),
  itemCount: integer("item_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** A research query answered by the agent (the citation-toll loop). */
export const research = sqliteTable("research", {
  id: text("id").primaryKey(),
  /** Who asked (R5 attribution, opt-in display). */
  profileId: text("profile_id"),
  question: text("question").notNull(),
  answer: text("answer"),
  mode: text("mode").notNull().default("mock"),
  citationCount: integer("citation_count").notNull().default(0),
  totalPaid: text("total_paid").notNull().default("0"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** A single citation: a grounded source that was PAID to retrieve (the auditable record). */
export const citations = sqliteTable(
  "citations",
  {
    id: text("id").primaryKey(),
    researchId: text("research_id")
      .notNull()
      .references(() => research.id),
    resourceId: text("resource_id"),
    resourceName: text("resource_name").notNull(),
    sourceUrl: text("source_url"),
    author: text("author"),
    /** Amount paid for this citation (base units). */
    amount: text("amount").notNull(),
    /** "gateway" (single author, gas-free) | "onchain" (multi-collaborator via RoyaltySplitter). */
    settlementType: text("settlement_type").notNull(),
    /** On-chain tx (split distribute) when settlementType = onchain. */
    txHash: text("tx_hash"),
    splitterAddress: text("splitter_address"),
    /** Split breakdown (JSON [{label,wallet,pct,amount}]) for display. */
    splits: text("splits"),
    /** Index of the cited source in the answer ([n]). */
    marker: integer("marker").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("citations_research").on(t.researchId), index("citations_resource").on(t.resourceId)],
);

export const SESSION_STATUS = ["flowing", "paused", "stopped"] as const;
export type SessionStatus = (typeof SESSION_STATUS)[number];

/** A streaming (per-second) metering session with proof-of-flow (Phase 4). */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id),
    payer: text("payer").notNull(),
    /** Rate in 6-dp USDC base units PER SECOND (string). */
    rate: text("rate").notNull(),
    /** Reserve cap in base units — the most that can be charged (never debited beyond this). */
    reserve: text("reserve").notNull(),
    /** Frozen flowed milliseconds (accrual only advances while flowing + heartbeat fresh). */
    accruedMs: integer("accrued_ms").notNull().default(0),
    status: text("status").$type<SessionStatus>().notNull().default("flowing"),
    /** True when paused by heartbeat loss (auto) — resumes on heartbeat return; manual pause does not. */
    flowPaused: integer("flow_paused", { mode: "boolean" }).notNull().default(false),
    /** Epoch ms when the current flowing stretch began (for lazy accrual). */
    lastTickAt: integer("last_tick_at").notNull(),
    /** Epoch ms of the last proof-of-flow heartbeat. */
    heartbeatAt: integer("heartbeat_at").notNull(),
    /** Settlement results at stop. */
    settledSeconds: integer("settled_seconds"),
    settledAmount: text("settled_amount"),
    receiptId: text("receipt_id"),
    startedAt: integer("started_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    stoppedAt: integer("stopped_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("sessions_resource").on(t.resourceId), index("sessions_status").on(t.status)],
);

export const MATCH_STATUS = ["active", "released", "slashed"] as const;
export type MatchStatus = (typeof MATCH_STATUS)[number];

/**
 * A broker match (Phase 5): a buyer's need paired with a provider who self-bonds USDC guaranteeing
 * delivery. Mirrors the on-chain BondEscrow bond; the chain is the source of truth, this row is the
 * indexed/displayable copy (need text, txs, reputation context).
 */
export const matches = sqliteTable(
  "matches",
  {
    id: text("id").primaryKey(),
    /** bytes32 match id used on-chain (BondEscrow key). */
    matchId: text("match_id").notNull().unique(),
    resourceId: text("resource_id").references(() => resources.id),
    /** Free-text description of what the buyer is hiring the provider to deliver. */
    need: text("need").notNull(),
    providerWallet: text("provider_wallet").notNull(),
    beneficiaryWallet: text("beneficiary_wallet").notNull(),
    /** ERC-8004 agentId of the provider (if registered). */
    agentId: integer("agent_id"),
    /** Bond amount in 6-dp USDC base units (string). */
    amount: text("amount").notNull(),
    status: text("status").$type<MatchStatus>().notNull().default("active"),
    reason: text("reason"),
    approveTx: text("approve_tx"),
    postTx: text("post_tx"),
    resolveTx: text("resolve_tx"),
    /** ERC-8004 feedback tx recorded on resolution. */
    feedbackTx: text("feedback_tx"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("matches_provider").on(t.providerWallet), index("matches_status").on(t.status)],
);

/** Quadratic funding (Phase 10): a contribution from a backer to a creator within a round. */
export const fundingTips = sqliteTable(
  "funding_tips",
  {
    id: text("id").primaryKey(),
    round: integer("round").notNull().default(1),
    backer: text("backer").notNull(),
    creator: text("creator").notNull(),
    resourceId: text("resource_id").references(() => resources.id),
    label: text("label"),
    /** tip amount in 6-dp USDC base units (string). */
    amount: text("amount").notNull(),
    /** sybil weight in basis points (10000 = full). */
    weightBps: integer("weight_bps").notNull().default(10000),
    tx: text("tx"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("funding_tips_round").on(t.round), index("funding_tips_creator").on(t.creator)],
);

export const FUNDING_ROUND_STATUS = ["open", "settled"] as const;
export type FundingRoundStatus = (typeof FUNDING_ROUND_STATUS)[number];

export const fundingRounds = sqliteTable("funding_rounds", {
  round: integer("round").primaryKey(),
  status: text("status").$type<FundingRoundStatus>().notNull().default("open"),
  /** matching budget in base units at settlement (string). */
  budget: text("budget"),
  matchTotal: text("match_total"),
  fundTx: text("fund_tx"),
  distributeTx: text("distribute_tx"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  settledAt: integer("settled_at", { mode: "timestamp_ms" }),
});

/**
 * People (R5, rule 16): ONE PROFILE = ONE HUMAN. A profile may link several wallets — they count
 * as a single user in every metric. Nothing here helps one person appear as many; distinct-user
 * counts cluster by profile first, wallet second.
 */
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  /** Optional public handle (unique, lowercase, a-z0-9-). */
  handle: text("handle").unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  /** Opt-in: only public profiles appear on /community and in attributions. */
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  /** Honest referral: the profile that invited this one (set once at creation). */
  refBy: text("ref_by"),
  joinedAt: integer("joined_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const profileWallets = sqliteTable(
  "profile_wallets",
  {
    /** lowercase 0x address */
    wallet: text("wallet").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id),
    linkedAt: integer("linked_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("profile_wallets_profile").on(t.profileId)],
);

export type Profile = typeof profiles.$inferSelect;
export type ProfileWallet = typeof profileWallets.$inferSelect;

export type Feed = typeof feeds.$inferSelect;
export type Research = typeof research.$inferSelect;
export type Citation = typeof citations.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type FundingTip = typeof fundingTips.$inferSelect;
export type FundingRound = typeof fundingRounds.$inferSelect;

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
