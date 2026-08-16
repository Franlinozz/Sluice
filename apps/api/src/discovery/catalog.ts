import type { Resource } from "../db/schema.ts";
import { buildRequirements, type PaymentRequirements } from "../payments/requirements.ts";

export interface DiscoveryQuery {
  type?: string;
  payTo?: string;
  scheme?: string;
  network?: string;
  extensions?: string;
  limit?: string | number;
  offset?: string | number;
}

export interface DiscoveryItem {
  resource: string;
  type: "http";
  x402Version: 2;
  accepts: PaymentRequirements[];
  lastUpdated: number;
  metadata: Record<string, unknown>;
}

export interface DiscoveryResponse {
  x402Version: 2;
  items: DiscoveryItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

function boundedInteger(value: string | number | undefined, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function resourceMetadata(resource: Resource): Record<string, unknown> {
  let registered: Record<string, unknown> = {};
  if (resource.metadata) {
    try {
      const parsed = JSON.parse(resource.metadata) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        registered = parsed as Record<string, unknown>;
      }
    } catch {
      // A malformed optional metadata value must not break discovery of the resource itself.
    }
  }

  return {
    ...registered,
    name: resource.name,
    description: resource.description ?? undefined,
    provider: "Sluice",
    unitType: resource.unitType,
    price: resource.unitPrice,
  };
}

export function buildDiscoveryCatalog(
  resources: Resource[],
  publicApiUrl: string,
  query: DiscoveryQuery = {},
): DiscoveryResponse {
  const baseUrl = publicApiUrl.replace(/\/$/, "");
  const type = query.type?.toLowerCase();
  const payTo = query.payTo?.toLowerCase();
  const scheme = query.scheme?.toLowerCase();
  const network = query.network?.toLowerCase();
  const extension = query.extensions?.toLowerCase();
  const limit = boundedInteger(query.limit, 20, 1, 100);
  const offset = boundedInteger(query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  const items = resources
    .filter((resource) => !resource.archived && resource.status === "active")
    .map<DiscoveryItem>((resource) => ({
      resource: `${baseUrl}/paid/${encodeURIComponent(resource.path)}`,
      type: "http",
      x402Version: 2,
      accepts: [buildRequirements(resource.unitPrice, resource.payTo)],
      lastUpdated: Math.floor(resource.createdAt.getTime() / 1000),
      metadata: resourceMetadata(resource),
    }))
    .filter((item) => !type || item.type === type)
    .filter((item) => !payTo || item.accepts.some((requirement) => requirement.payTo.toLowerCase() === payTo))
    .filter((item) => !scheme || item.accepts.some((requirement) => requirement.scheme.toLowerCase() === scheme))
    .filter((item) => !network || item.accepts.some((requirement) => requirement.network.toLowerCase() === network))
    // Sluice currently advertises no optional Bazaar extensions. Preserve the standard filter
    // semantics by returning no matches when a caller requires one.
    .filter(() => !extension)
    .sort((a, b) => b.lastUpdated - a.lastUpdated || a.resource.localeCompare(b.resource));

  return {
    x402Version: 2,
    items: items.slice(offset, offset + limit),
    pagination: { limit, offset, total: items.length },
  };
}
