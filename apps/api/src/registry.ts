/** Resource registry — register/list/get priced, x402-protected resources. */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { parseUSDC, toBaseUnitString } from "@sluice/money";
import { db } from "./db/client.ts";
import { resources, UNIT_TYPES, type Resource, type UnitType } from "./db/schema.ts";

export interface RegisterResourceInput {
  name: string;
  description?: string;
  unitType: UnitType;
  /** Human price per unit, e.g. "$0.001" or "0.000001". */
  price: string;
  /** Seller address to receive settlement (defaults to the configured seller wallet). */
  payTo?: string;
  /** URL slug for the protected endpoint. */
  path: string;
  metadata?: Record<string, unknown>;
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

export function registerResource(input: RegisterResourceInput): Resource {
  if (!UNIT_TYPES.includes(input.unitType)) {
    throw new Error(`Invalid unitType: ${input.unitType}`);
  }
  const unitPrice = toBaseUnitString(parseUSDC(input.price)); // throws on bad price
  const payTo = input.payTo ?? DEFAULT_SELLER;
  if (!payTo) throw new Error("payTo is required (no SELLER_ADDRESS configured)");
  const path = slugify(input.path || input.name);
  if (!path) throw new Error("path is required");

  const existing = getResourceByPath(path);
  if (existing) throw new Error(`A resource already exists at path "${path}"`);

  const id = randomUUID();
  db.insert(resources)
    .values({
      id,
      name: input.name,
      description: input.description ?? null,
      unitType: input.unitType,
      unitPrice,
      payTo,
      path,
      status: "active",
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })
    .run();
  return db.select().from(resources).where(eq(resources.id, id)).get()!;
}

export function listResources(): Resource[] {
  return db.select().from(resources).all();
}

export function getResource(id: string): Resource | undefined {
  return db.select().from(resources).where(eq(resources.id, id)).get();
}

export function getResourceByPath(path: string): Resource | undefined {
  return db.select().from(resources).where(eq(resources.path, path)).get();
}
