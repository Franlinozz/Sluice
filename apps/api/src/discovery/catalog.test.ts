import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Resource } from "../db/schema.ts";
import { buildDiscoveryCatalog } from "./catalog.ts";

const walletA = "0x1111111111111111111111111111111111111111";
const walletB = "0x2222222222222222222222222222222222222222";

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "resource-1",
    profileId: null,
    name: "Weather pulse",
    description: "Current weather data",
    unitType: "per_request",
    unitPrice: "1000",
    payTo: walletA,
    path: "weather-pulse",
    status: "active",
    archived: false,
    metadata: JSON.stringify({ category: "weather" }),
    author: null,
    contentUrl: null,
    sourceType: "url",
    splits: null,
    splitterAddress: null,
    feedId: null,
    createdAt: new Date("2026-08-16T12:00:00.000Z"),
    ...overrides,
  };
}

describe("buildDiscoveryCatalog", () => {
  it("emits x402 v2 resources with live Sluice payment requirements", () => {
    const result = buildDiscoveryCatalog([resource()], "https://sluiceflow.vercel.app/gw/");

    assert.equal(result.x402Version, 2);
    assert.deepEqual(result.pagination, { limit: 20, offset: 0, total: 1 });
    assert.equal(result.items[0]?.resource, "https://sluiceflow.vercel.app/gw/paid/weather-pulse");
    assert.equal(result.items[0]?.lastUpdated, 1_786_881_600);
    assert.equal(result.items[0]?.accepts[0]?.amount, "1000");
    assert.equal(result.items[0]?.accepts[0]?.payTo, walletA);
    assert.equal(result.items[0]?.metadata.category, "weather");
    assert.equal(result.items[0]?.metadata.unitType, "per_request");
  });

  it("excludes archived and inactive resources", () => {
    const result = buildDiscoveryCatalog([
      resource(),
      resource({ id: "archived", path: "archived", archived: true }),
      resource({ id: "paused", path: "paused", status: "paused" }),
    ], "https://example.com");

    assert.equal(result.pagination.total, 1);
    assert.equal(result.items[0]?.resource, "https://example.com/paid/weather-pulse");
  });

  it("filters payment terms before applying bounded pagination", () => {
    const resources = [
      resource({ id: "newest", path: "newest", payTo: walletB, createdAt: new Date("2026-08-16T13:00:00Z") }),
      resource({ id: "older", path: "older", payTo: walletA }),
    ];

    const filtered = buildDiscoveryCatalog(resources, "https://example.com", {
      payTo: walletB.toUpperCase(),
      scheme: "EXACT",
      limit: "250",
      offset: "0",
    });
    assert.deepEqual(filtered.pagination, { limit: 100, offset: 0, total: 1 });
    assert.equal(filtered.items[0]?.resource, "https://example.com/paid/newest");

    const unsupported = buildDiscoveryCatalog(resources, "https://example.com", { extensions: "bazaar" });
    assert.equal(unsupported.pagination.total, 0);
  });

  it("falls back safely when optional metadata is malformed", () => {
    const result = buildDiscoveryCatalog([resource({ metadata: "not-json" })], "https://example.com");
    assert.equal(result.items[0]?.metadata.name, "Weather pulse");
  });
});
