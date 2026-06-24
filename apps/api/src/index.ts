/**
 * Sluice API (Fastify) — payments core + the Meter. Runs on the VPS (pm2), not Vercel.
 */
import "./env.ts";
import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Address } from "viem";
import { formatUSD } from "@sluice/money";
import { arcConfig, explorerAddressUrl, explorerTxUrl, getClient } from "@sluice/chain";
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
import {
  agentRules,
  createAgent,
  getAgent,
  getDecisions,
  getRun,
  latestRun,
  listAgents,
  listRuns,
} from "./agent/store.ts";
import { runAgentSession } from "./agent/runner.ts";
import { buyerAddress } from "./agent/pay.ts";
import { ingestFeed, listFeeds } from "./connectors/rss.ts";
import { getResearch, recentResearch, resourceEarned, runResearch } from "./agent/research.ts";
import type { Agent, Decision, Receipt, Resource, Run } from "./db/schema.ts";

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
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://sluice-six.vercel.app";
const API_PUBLIC = process.env.API_PUBLIC_URL ?? `http://62.171.182.75:${port}`;

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
    author: r.author,
    contentUrl: r.contentUrl,
    sourceType: r.sourceType,
    splits: r.splits ? (JSON.parse(r.splits) as unknown[]) : null,
    splitterAddress: r.splitterAddress,
    splitterUrl: r.splitterAddress ? explorerAddressUrl(r.splitterAddress) : null,
    feedId: r.feedId,
    earned: resourceEarned(r.id).toString(),
    formattedEarned: formatUSD(resourceEarned(r.id)),
    rslUrl: `${API_PUBLIC}/resources/${r.id}/rsl`,
    llmsTxtUrl: `${API_PUBLIC}/resources/${r.id}/llms.txt`,
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
    const resource = await registerResource(body);
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

// ── Agents (Phase 2) ─────────────────────────────────────────────────────────
function serializeAgent(a: Agent) {
  const rules = agentRules(a);
  return {
    id: a.id,
    name: a.name,
    task: a.task,
    budget: a.budget,
    formattedBudget: formatUSD(BigInt(a.budget)),
    policy: a.policy,
    rules: {
      ...rules,
      formattedPriceCeiling: rules.priceCeiling ? formatUSD(BigInt(rules.priceCeiling)) : null,
    },
    buyer: buyerAddress() ?? null,
    createdAt: a.createdAt,
  };
}

function serializeRun(r: Run, paidCount?: number) {
  // "Value delivered" = total relevance acquired; avgRelevance is the honest quality-of-spend metric.
  const avgRelevance = paidCount && paidCount > 0 ? Math.round(r.value / paidCount) : null;
  return {
    id: r.id,
    agentId: r.agentId,
    status: r.status,
    spent: r.spent,
    formattedSpent: formatUSD(BigInt(r.spent)),
    value: r.value,
    avgRelevance,
    steps: r.steps,
    mode: r.mode,
    note: r.note,
    paidCount: paidCount ?? null,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  };
}

function serializeDecision(d: Decision) {
  return {
    id: d.id,
    resourceId: d.resourceId,
    resourceName: d.resourceName,
    decision: d.decision,
    relevance: d.relevance,
    reason: d.reason,
    amount: d.amount,
    formattedAmount: d.amount ? formatUSD(BigInt(d.amount)) : null,
    paid: d.paid,
    createdAt: d.createdAt,
  };
}

app.post("/agents", async (req, reply) => {
  try {
    const body = req.body as Parameters<typeof createAgent>[0];
    const agent = await createAgent(body);
    reply.code(201).send(serializeAgent(agent));
  } catch (err) {
    reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/agents", async () =>
  listAgents().map((a) => {
    const run = latestRun(a.id);
    return { ...serializeAgent(a), latestRun: run ? serializeRun(run) : null };
  }),
);

app.get("/agents/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const a = getAgent(id);
  if (!a) return reply.code(404).send({ error: "agent not found" });
  const run = latestRun(id);
  return {
    ...serializeAgent(a),
    latestRun: run ? { ...serializeRun(run), decisions: getDecisions(run.id).map(serializeDecision) } : null,
  };
});

app.post("/agents/:id/run", async (req, reply) => {
  const { id } = req.params as { id: string };
  if (!getAgent(id)) return reply.code(404).send({ error: "agent not found" });
  try {
    const run = await runAgentSession(id);
    const decisions = getDecisions(run.id);
    return {
      ...serializeRun(run, decisions.filter((d) => d.paid).length),
      decisions: decisions.map(serializeDecision),
    };
  } catch (err) {
    reply.code(500).send({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/agents/:id/runs", async (req) => {
  const { id } = req.params as { id: string };
  return listRuns(id).map((r) => serializeRun(r));
});

app.get("/runs/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const run = getRun(id);
  if (!run) return reply.code(404).send({ error: "run not found" });
  const decisions = getDecisions(id);
  return {
    ...serializeRun(run, decisions.filter((d) => d.paid).length),
    decisions: decisions.map(serializeDecision),
  };
});

app.get("/gateway/balance", async (req) => {
  const q = req.query as { address?: string };
  const address = (q.address ?? SELLER) as Address;
  if (!address) return { error: "no address" };
  return readGatewayBalance(address);
});

// ── Phase 3: citation toll, RSS connector, RSL/llms.txt, badge ───────────────
void APP_URL;

app.post("/connectors/rss", async (req, reply) => {
  try {
    const body = req.body as Parameters<typeof ingestFeed>[0];
    const res = await ingestFeed(body);
    reply.code(201).send(res);
  } catch (err) {
    reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/feeds", async () => listFeeds());

function serializeCitation(c: {
  marker: number;
  resourceName: string;
  sourceUrl: string | null;
  author: string | null;
  amount: string;
  settlementType: string;
  txHash: string | null;
  splits: unknown;
}) {
  return {
    ...c,
    formattedAmount: formatUSD(BigInt(c.amount)),
    explorerUrl: c.txHash ? explorerTxUrl(c.txHash) : null,
  };
}

app.post("/research", async (req, reply) => {
  const body = (req.body ?? {}) as { question?: string };
  if (!body.question || !body.question.trim()) {
    return reply.code(400).send({ error: "question is required" });
  }
  try {
    const r = await runResearch(body.question.trim());
    return {
      ...r,
      formattedTotalPaid: formatUSD(BigInt(r.totalPaid)),
      citations: r.citations.map(serializeCitation),
    };
  } catch (err) {
    reply.code(500).send({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/research", async () => recentResearch());

app.get("/research/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const r = getResearch(id);
  if (!r) return reply.code(404).send({ error: "research not found" });
  return {
    research: { ...r.research, formattedTotalPaid: formatUSD(BigInt(r.research.totalPaid)) },
    citations: r.citations.map((c) =>
      serializeCitation({
        marker: c.marker,
        resourceName: c.resourceName,
        sourceUrl: c.sourceUrl,
        author: c.author,
        amount: c.amount,
        settlementType: c.settlementType,
        txHash: c.txHash,
        splits: c.splits ? JSON.parse(c.splits) : null,
      }),
    ),
  };
});

// RSL-compatible policy file (declares terms AND points crawlers/agents at the Sluice toll).
app.get("/resources/:id/rsl", async (req, reply) => {
  const { id } = req.params as { id: string };
  const r = getResource(id);
  if (!r) return reply.code(404).send({ error: "resource not found" });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsl xmlns="https://rslstandard.org/rsl">
  <content url="${r.contentUrl ?? `${API_PUBLIC}/paid/${r.path}`}">
    <license server="${API_PUBLIC}/paid/${r.path}">
      <permits type="usage">ai-train,ai-use,search,crawl</permits>
      <payment type="${r.unitType.replace("per_", "per-")}">
        <amount currency="USDC">${(Number(r.unitPrice) / 1e6).toFixed(6)}</amount>
        <network>${arcConfig.caip2}</network>
        <endpoint>${API_PUBLIC}/paid/${r.path}</endpoint>
      </payment>
    </license>
  </content>
</rsl>
`;
  reply.header("Content-Type", "application/xml; charset=utf-8").send(xml);
});

app.get("/resources/:id/llms.txt", async (req, reply) => {
  const { id } = req.params as { id: string };
  const r = getResource(id);
  if (!r) return reply.code(404).send({ error: "resource not found" });
  const price = (Number(r.unitPrice) / 1e6).toFixed(6);
  const txt = `# ${r.name} — metered content (Sluice citation toll)
# AI agents & crawlers: this content is licensed per use and SETTLED on Arc (USDC) via x402.
Resource: ${r.name}
Author: ${r.author ?? "—"}
Content: ${r.contentUrl ?? "—"}
Unit: ${r.unitType}
Price: ${price} USDC
Network: Arc Testnet (${arcConfig.caip2})
Toll-Endpoint: ${API_PUBLIC}/paid/${r.path}
RSL: ${API_PUBLIC}/resources/${r.id}/rsl
Badge: ${API_PUBLIC}/badge/${r.id}
# RSL-compatible: declares terms AND points to real settlement (unlike declare-only schemes).
`;
  reply.header("Content-Type", "text/plain; charset=utf-8").send(txt);
});

// Embeddable greyscale "Pay-per-cite" badge with a live, REAL earned counter.
app.get("/badge/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const r = getResource(id);
  const earned = r ? formatUSD(resourceEarned(r.id)) : "$0.00";
  const label = r ? r.name.slice(0, 22) : "Unknown";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="268" height="46" role="img" aria-label="Pay-per-cite">
  <rect width="268" height="46" rx="10" fill="#111113" stroke="#2a2c31"/>
  <circle cx="20" cy="23" r="3" fill="#e8eaed"/>
  <text x="34" y="18" font-family="ui-monospace,Menlo,monospace" font-size="8" letter-spacing="1.4" fill="#6a6e76">PAY-PER-CITE · SLUICE</text>
  <text x="34" y="34" font-family="Inter,system-ui,sans-serif" font-size="12" fill="#f4f5f6">${label.replace(/[<&>]/g, "")}</text>
  <text x="258" y="20" text-anchor="end" font-family="ui-monospace,Menlo,monospace" font-size="13" fill="#f4f5f6">${earned}</text>
  <text x="258" y="34" text-anchor="end" font-family="ui-monospace,Menlo,monospace" font-size="8" fill="#57c98a">earned · Arc</text>
</svg>`;
  reply
    .header("Content-Type", "image/svg+xml")
    .header("Cache-Control", "no-store, max-age=0")
    .send(svg);
});

app.get("/resources/:id/earned", async (req, reply) => {
  const { id } = req.params as { id: string };
  const r = getResource(id);
  if (!r) return reply.code(404).send({ error: "resource not found" });
  const earned = resourceEarned(r.id);
  return { resourceId: r.id, earned: earned.toString(), formattedEarned: formatUSD(earned) };
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
