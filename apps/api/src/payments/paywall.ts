/**
 * withGateway paywall for Fastify routes. Verifies the payment, ACCRUES it (deferred settlement),
 * and returns the resource immediately (CLAUDE.md #8: authorized → batching → settled, never fake).
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { formatUSD, toBaseUnitString } from "@sluice/money";
import type { Resource } from "../db/schema.ts";
import {
  buildRequirements,
  decodePaymentSignature,
  encodePaymentRequired,
  payloadNonce,
  type PaymentPayload,
} from "./requirements.ts";
import { verifyPayment } from "./facilitator.ts";
import { accrue, batchSettlePayer, shouldSettle } from "../meter/meter.ts";
import { unitRateLabel } from "../meter/units.ts";

function payloadPayer(payload: PaymentPayload): string | undefined {
  const p = payload.payload as Record<string, unknown> | undefined;
  const auth = p?.authorization as Record<string, unknown> | undefined;
  const from = auth?.from ?? p?.from;
  return typeof from === "string" ? from : undefined;
}

export interface PaywallOptions {
  resource: Resource;
  /** Units billed for THIS request (must be known before the 402 so the amount is deterministic). */
  units: number;
  /** Produces the resource content once payment is accrued. */
  content: () => unknown;
}

export async function applyPaywall(
  req: FastifyRequest,
  reply: FastifyReply,
  opts: PaywallOptions,
): Promise<void> {
  const { resource } = opts;
  const units = Math.max(1, Math.floor(opts.units || 1));
  const amount = BigInt(resource.unitPrice) * BigInt(units);
  const amountStr = toBaseUnitString(amount);
  const endpoint = `/paid/${resource.path}`;
  const requirements = buildRequirements(amountStr, resource.payTo);

  const sig = req.headers["payment-signature"];
  if (!sig || typeof sig !== "string") {
    reply
      .code(402)
      .header("PAYMENT-REQUIRED", encodePaymentRequired(requirements, endpoint, formatUSD(amount)))
      .header("Content-Type", "application/json")
      .send({
        error: "payment required",
        price: formatUSD(amount),
        unit: unitRateLabel(resource.unitType),
        units,
      });
    return;
  }

  let payload: PaymentPayload;
  try {
    payload = decodePaymentSignature(sig);
  } catch {
    reply.code(400).send({ error: "invalid payment-signature header" });
    return;
  }

  let verification;
  try {
    verification = await verifyPayment(payload, requirements);
  } catch (err) {
    // Circle Gateway transient error (e.g. rate-limit returning HTML → SDK JSON.parse throws).
    // Never 500: report a retryable 503 so the buyer can back off (CLAUDE.md: honest states, no crash).
    req.log.warn({ err: String(err) }, "verify threw (transient)");
    reply.code(503).send({ error: "verification temporarily unavailable", retryable: true });
    return;
  }
  if (!verification.isValid) {
    req.log.warn(
      {
        invalidReason: verification.invalidReason,
        requirements,
        payloadPreview: JSON.stringify(payload).slice(0, 800),
      },
      "verify failed",
    );
    reply.code(402).send({ error: "payment verification failed", reason: verification.invalidReason });
    return;
  }

  const payer = verification.payer ?? payloadPayer(payload) ?? "unknown";
  const nonce = payloadNonce(payload);
  const accrual = accrue({
    resourceId: resource.id,
    payer,
    unitType: resource.unitType,
    units,
    amountBaseUnits: amountStr,
    paymentPayload: payload,
    nonce,
  });

  // Deferred settlement: fire a batch if the threshold is reached, without blocking the response.
  if (shouldSettle(resource.id, payer)) {
    void batchSettlePayer(resource.id, payer).catch((e) =>
      req.log.error({ err: String(e) }, "auto batch settle failed"),
    );
  }

  reply
    .header(
      "PAYMENT-RESPONSE",
      Buffer.from(
        JSON.stringify({
          success: true,
          accrued: true,
          status: "authorized",
          payer,
          amount: amountStr,
          accrualId: accrual.id,
        }),
      ).toString("base64"),
    )
    .send({
      paid: true,
      status: "authorized",
      payer,
      amount: amountStr,
      formatted: formatUSD(amount),
      resource: opts.content(),
    });
}
