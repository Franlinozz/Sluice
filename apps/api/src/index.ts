/**
 * Sluice API (Fastify) — payments core + the Meter. Runs on the VPS (pm2), not Vercel.
 */
import "./env.ts";
import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Address } from "viem";
import { formatUSD } from "@sluice/money";
import { arcConfig, explorerTxUrl, getClient } from "@sluice/chain";
import { runMigrations } from "./db/client.ts";
import { getResource, getResourceByPath, listResources, registerResource } from "./registry.ts";
import { applyPaywall } from "./payments/paywall.ts";
import { unitRateLabel } from "./meter/units.ts";
import {
  aggregates,
  batchSettlePayer,
  getReceipt,
  listReceipts,
  reconcilePending,
  settleAllPending,
} from "./meter/meter.ts";
import { getSettlementBackend } from "./meter/backends.ts";
import { readGatewayBalance } from "./gateway-balance.ts";
import type { Receipt, Resource } from "./db/schema.ts";

// Boot guard: server secrets must never be exposed as NEXT_PUBLIC_* (CLAUDE.md #12).
for (const key of Object.keys(process.env)) {
  if (key.startsWith("NEXT_PUBLIC_") && /(PRIVATE_KEY|SERVICE_ROLE|ENTITY_SECRET|_API_KEY)/i.test(key)) {
    throw new Error(`Refusing to start: secret-looking value exposed to the client as ${key}`);
  }
}

runMigrations();

const port = Number(process.env.API_PORT ?? 3001);
const origins = (process.env.API_CORS_ORIGINS ?? "http://localhost:3000,https://sluice-six.vercel.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SELLER = (process.env.SELLER_ADDRESS ?? process.env.ARC_WALLET_ADDRESS ?? "") as Address;
const SETTLE_INTERVAL_MS = Number(process.env.METER_SETTLE_INTERVAL_MS ?? "60000");

const app = Fastify({ logger: true });
await app.register(cors, { origin: origins });

// ── serializers (format money + explorer links at the edge) ──────────────────
function serializeResource(r: Resource) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    unitType: r.unitType,
    unitPrice: r.unitPrice,
    formattedPrice: formatUSD(BigInt(r.unitPrice)),
    rateLabel: `${formatUSD(BigInt(r.unitPrice))} / ${unitRateLabel(r.unitType).replace("per ", "")}`,
    payTo: r.payTo,
    path: r.path,
    status: r.status,
    createdAt: r.createdAt,
    endpoint: `/paid/${r.path}`,
  };
}

function serializeReceipt(r: Receipt) {
  return {
    id: r.id,
    resourceId: r.resourceId,
    payer: r.payer,
    unitType: r.unitType,
    units: r.units,
    rate: r.rate,
    grossAmount: r.grossAmount,
    formattedRate: formatUSD(BigInt(r.rate)),
    formattedAmount: formatUSD(BigInt(r.grossAmount)),
    batchTxHash: r.batchTxHash,
    explorerUrl:
      r.batchTxHash && /^0x[0-9a-fA-F]{64}$/.test(r.batchTxHash)
        ? explorerTxUrl(r.batchTxHash)
        : null,
    settlementRef: r.settlementRef ? (JSON.parse(r.settlementRef) as string[]) : [],
    backend: r.backend,
    status: r.status,
    createdAt: r.createdAt,
    settledAt: r.settledAt,
  };
}

// ── routes ───────────────────────────────────────────────────────────────────
app.get("/", async () => ({ service: "sluice-api", status: "ok", network: arcConfig.caip2 }));
app.get("/health", async () => ({
  ok: true,
  service: "sluice-api",
  chainId: arcConfig.chainId,
  network: arcConfig.caip2,
  backend: getSettlementBackend().name,
  ts: new Date().toISOString(),
}));

app.post("/resources", async (req, reply) => {
  try {
    const body = req.body as Parameters<typeof registerResource>[0];
    const resource = registerResource(body);
    reply.code(201).send(serializeResource(resource));
  } catch (err) {
    reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/resources", async () => listResources().map(serializeResource));

app.get("/resources/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const r = getResource(id);
  if (!r) return reply.code(404).send({ error: "resource not found" });
  return serializeResource(r);
});

// The paywalled resource endpoint.
const paidHandler = async (req: Parameters<typeof applyPaywall>[0], reply: Parameters<typeof applyPaywall>[1]) => {
  const { path } = req.params as { path: string };
  const resource = getResourceByPath(path);
  if (!resource) return reply.code(404).send({ error: "resource not found" });
  const q = req.query as { units?: string };
  const units = Math.max(1, Math.floor(Number(q.units ?? "1")) || 1);
  await applyPaywall(req, reply, {
    resource,
    units,
    content: () => ({
      source: resource.name,
      unitType: resource.unitType,
      servedAt: new Date().toISOString(),
      note: "Paid content delivered by Sluice.",
    }),
  });
};
app.get("/paid/:path", paidHandler);
app.post("/paid/:path", paidHandler);

// Trigger settlement (threshold/timer also do this automatically).
app.post("/settle", async (req, reply) => {
  const body = (req.body ?? {}) as { resourceId?: string; payer?: string; backend?: string };
  const backend = getSettlementBackend(body.backend);
  try {
    if (body.resourceId && body.payer) {
      const r = await batchSettlePayer(body.resourceId, body.payer, backend);
      return { settled: r ? 1 : 0, receipts: r ? [serializeReceipt(r)] : [] };
    }
    const rs = await settleAllPending(backend);
    return { settled: rs.length, receipts: rs.map(serializeReceipt) };
  } catch (err) {
    reply.code(500).send({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/receipts", async () => listReceipts().map(serializeReceipt));

app.get("/receipts/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const r = getReceipt(id);
  if (!r) return reply.code(404).send({ error: "receipt not found" });
  return serializeReceipt(r);
});

// Re-read the batch tx on-chain — "don't trust, verify".
app.post("/receipts/:id/verify", async (req, reply) => {
  const { id } = req.params as { id: string };
  let r = getReceipt(id);
  if (!r) return reply.code(404).send({ error: "receipt not found" });

  // If still batching, try to resolve the on-chain tx now.
  if (!r.batchTxHash || !/^0x[0-9a-fA-F]{64}$/.test(r.batchTxHash)) {
    await reconcilePending().catch(() => {});
    r = getReceipt(id) ?? r;
  }
  if (!r.batchTxHash || !/^0x[0-9a-fA-F]{64}$/.test(r.batchTxHash)) {
    return {
      verified: false,
      status: r.status,
      reason: "batch not yet settled on-chain (Circle batches asynchronously)",
      settlementRef: r.settlementRef ? (JSON.parse(r.settlementRef) as string[]) : [],
    };
  }
  try {
    const txr = await getClient().getTransactionReceipt({ hash: r.batchTxHash as `0x${string}` });
    return {
      verified: txr.status === "success",
      status: txr.status,
      blockNumber: txr.blockNumber.toString(),
      explorerUrl: explorerTxUrl(r.batchTxHash),
    };
  } catch (err) {
    return { verified: false, reason: err instanceof Error ? err.message : String(err) };
  }
});

app.get("/kpis", async () => {
  const a = aggregates();
  return {
    ...a,
    formattedTotalSettled: formatUSD(BigInt(a.totalSettled)),
    formattedBatchingAmount: formatUSD(BigInt(a.batchingAmount)),
  };
});

// Manually kick the reconciler (the timer also does this).
app.post("/reconcile", async () => ({ updated: await reconcilePending() }));

app.get("/gateway/balance", async (req) => {
  const q = req.query as { address?: string };
  const address = (q.address ?? SELLER) as Address;
  if (!address) return { error: "no address" };
  return readGatewayBalance(address);
});

// ── timers: batch settle (the "timer" trigger) + reconcile on-chain ──────────
if (SETTLE_INTERVAL_MS > 0) {
  setInterval(() => {
    settleAllPending().catch((e) => app.log.error({ err: String(e) }, "timer settle failed"));
  }, SETTLE_INTERVAL_MS);
}
const RECONCILE_INTERVAL_MS = Number(process.env.METER_RECONCILE_INTERVAL_MS ?? "20000");
if (RECONCILE_INTERVAL_MS > 0) {
  setInterval(() => {
    reconcilePending().catch((e) => app.log.error({ err: String(e) }, "reconcile failed"));
  }, RECONCILE_INTERVAL_MS);
}

try {
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(
    `Sluice API on :${port} · ${arcConfig.caip2} · backend=${getSettlementBackend().name} · seller=${SELLER || "(unset)"}`,
  );
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
