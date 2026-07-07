/** Resource registry — register/list/get priced, x402-protected resources. */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { parseUSDC, toBaseUnitString } from "@sluice/money";
import { db } from "./db/client.ts";
import { resources, UNIT_TYPES, type Resource, type UnitType } from "./db/schema.ts";
import { deploySplitter, type SplitShare } from "./contracts/splitter.ts";

export interface RegisterResourceInput {
  name: string;
  /** Who registered it (R5 attribution, opt-in display). */
  profileId?: string;
  description?: string;
  unitType: UnitType;
  /** Human price per unit, e.g. "$0.001" or "0.000001". */
  price: string;
  /** Seller address to receive settlement (defaults to the configured seller wallet). */
  payTo?: string;
  /** URL slug for the protected endpoint. */
  path: string;
  metadata?: Record<string, unknown>;
  // Phase 3 (citation toll)
  author?: string;
  contentUrl?: string;
  sourceType?: "url" | "feed_item" | "domain";
  /** Attribution splits. ≥2 collaborators → deploy a RoyaltySplitter (unless splitterAddress given). */
  splits?: SplitShare[];
  /** Reuse a pre-deployed splitter (e.g. one per feed). */
  splitterAddress?: string;
  feedId?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const DEFAULT_SELLER =
  process.env.SELLER_ADDRESS ?? process.env.ARC_WALLET_ADDRESS ?? "";

function validateSplits(splits: SplitShare[]): void {
  const total = splits.reduce((a, s) => a + s.pct, 0);
  if (Math.abs(total - 100) > 0.5) throw new Error(`splits must sum to 100 (got ${total})`);
  for (const s of splits) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(s.wallet)) throw new Error(`invalid wallet: ${s.wallet}`);
    if (s.pct <= 0) throw new Error("each split pct must be > 0");
  }
}

export async function registerResource(input: RegisterResourceInput): Promise<Resource> {
  if (!UNIT_TYPES.includes(input.unitType)) {
    throw new Error(`Invalid unitType: ${input.unitType}`);
  }
  const unitPrice = toBaseUnitString(parseUSDC(input.price)); // throws on bad price
  const path = slugify(input.path || input.name);
  if (!path) throw new Error("path is required");
  if (getResourceByPath(path)) throw new Error(`A resource already exists at path "${path}"`);

  // Multi-collaborator → deploy (or reuse) a RoyaltySplitter; payTo = the splitter.
  const splits = input.splits && input.splits.length >= 2 ? input.splits : null;
  let splitterAddress = input.splitterAddress ?? null;
  if (splits && !splitterAddress) {
    validateSplits(splits);
    splitterAddress = await deploySplitter(splits);
  }

  if (input.payTo && !/^0x[0-9a-fA-F]{40}$/.test(input.payTo)) {
    throw new Error(`invalid payTo address: ${input.payTo}`);
  }
  const payTo = splitterAddress ?? input.payTo ?? DEFAULT_SELLER;
  if (!payTo) throw new Error("payTo is required (no SELLER_ADDRESS configured)");

  const id = randomUUID();
  db.insert(resources)
    .values({
      id,
      profileId: input.profileId ?? null,
      name: input.name,
      description: input.description ?? null,
      unitType: input.unitType,
      unitPrice,
      payTo,
      path,
      status: "active",
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      author: input.author ?? null,
      contentUrl: input.contentUrl ?? null,
      sourceType: input.sourceType ?? "url",
      splits: splits ? JSON.stringify(splits) : null,
      splitterAddress,
      feedId: input.feedId ?? null,
    })
    .run();
  return db.select().from(resources).where(eq(resources.id, id)).get()!;
}

/** Active (non-archived) resources — what Bazaar/Streams/Studio show. */
export function listResources(): Resource[] {
  return db.select().from(resources).where(eq(resources.archived, false)).all();
}

/** Everything, including archived (receipts lookups, admin/curation). */
export function listAllResources(): Resource[] {
  return db.select().from(resources).all();
}

export function getResource(id: string): Resource | undefined {
  return db.select().from(resources).where(eq(resources.id, id)).get();
}

export function getResourceByPath(path: string): Resource | undefined {
  return db.select().from(resources).where(eq(resources.path, path)).get();
}
