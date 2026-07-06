/**
 * A STANDALONE second x402 endpoint (R5 cross-team proof). Simulates another team's paid service:
 * its own Fastify on :3011, its own payTo wallet, its own immediate settlement — completely outside
 * the Sluice registry/meter. Used to prove the exchange path end-to-end:
 *   register it as a partner (probe passes) → a Sluice agent PAYS it → settlement on Arc.
 *
 *   pnpm --filter @sluice/api exec tsx scripts/partner-endpoint.ts   (leave running for the demo)
 */
import "../src/env.ts";
import Fastify from "fastify";
import { formatUSD } from "@sluice/money";
import {
  buildRequirements,
  decodePaymentSignature,
  encodePaymentRequired,
  type PaymentPayload,
} from "../src/payments/requirements.ts";
import { verifyPayment, settlePayment } from "../src/payments/facilitator.ts";

const PORT = Number(process.env.PARTNER_PORT ?? 3011);
// "The other team's" receiving wallet — the demo uses the seller address so settlement is real,
// but this server shares NOTHING else with the Sluice registry (no meter, no DB).
const PAY_TO = process.env.PARTNER_PAY_TO ?? process.env.SELLER_ADDRESS!;
const PRICE = "2000"; // $0.002 per request, atomic USDC

const app = Fastify({ logger: false });

app.get("/paid/hello", async (req, reply) => {
  const requirements = buildRequirements(PRICE, PAY_TO);
  const sig = req.headers["payment-signature"];
  if (!sig || typeof sig !== "string") {
    return reply
      .code(402)
      .header("PAYMENT-REQUIRED", encodePaymentRequired(requirements, "/paid/hello", formatUSD(BigInt(PRICE))))
      .send({ error: "payment required", price: formatUSD(BigInt(PRICE)), team: "demo-partner" });
  }
  let payload: PaymentPayload;
  try {
    payload = decodePaymentSignature(sig);
  } catch {
    return reply.code(400).send({ error: "invalid payment-signature" });
  }
  const v = await verifyPayment(payload, requirements);
  if (!v.isValid) return reply.code(402).send({ error: "payment invalid" });
  // this "team" settles immediately (their choice — not our meter)
  const s = await settlePayment(payload, requirements).catch(() => null);
  return reply.send({
    team: "demo-partner",
    message: "hello from another team's x402 endpoint — you actually paid for this",
    paid: formatUSD(BigInt(PRICE)),
    settlement: s ?? "verified (settlement async)",
    servedAt: new Date().toISOString(),
  });
});

app.get("/health", async () => ({ ok: true, service: "demo-partner-x402" }));

await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`demo partner x402 endpoint on :${PORT} · payTo ${PAY_TO}`);
