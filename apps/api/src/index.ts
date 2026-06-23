/**
 * Sluice API (Fastify) — Phase 0 stub.
 * Later: THE METER (accrual engine), batch-settlement timers, connector webhooks, reconciliation.
 * Runs on the VPS (pm2), not on Vercel (long-running/stateful).
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import { arcConfig } from "@sluice/chain";

// Boot-time guard: server secrets must never be exposed as NEXT_PUBLIC_* (CLAUDE.md #12).
for (const key of Object.keys(process.env)) {
  if (key.startsWith("NEXT_PUBLIC_") && /(PRIVATE_KEY|SERVICE_ROLE|ENTITY_SECRET|_API_KEY)/i.test(key)) {
    throw new Error(`Refusing to start: secret-looking value exposed to the client as ${key}`);
  }
}

const port = Number(process.env.API_PORT ?? 3001);
const origins = (process.env.API_CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = Fastify({ logger: true });

await app.register(cors, { origin: origins });

app.get("/health", async () => ({
  ok: true,
  service: "sluice-api",
  chainId: arcConfig.chainId,
  network: arcConfig.caip2,
  ts: new Date().toISOString(),
}));

app.get("/", async () => ({
  service: "sluice-api",
  status: "ok",
  note: "The Meter, settlement, and connectors arrive in later phases.",
}));

try {
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`Sluice API on :${port} · ${arcConfig.caip2}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
