/**
 * x402 payment requirements for the Circle Gateway batched scheme.
 * Verified shape (CLAUDE.md): scheme "exact", extra.name "GatewayWalletBatched",
 * extra.verifyingContract = the Gateway Wallet contract (NOT the USDC token).
 */
import { arcConfig } from "@sluice/chain";

export interface PaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface PaymentPayload {
  x402Version: number;
  resource?: { url: string; description: string; mimeType: string };
  accepted?: Record<string, unknown>;
  payload: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

/**
 * Authorization validity window (validBefore = now + this). Circle's BATCHED Gateway rejects
 * short windows ("authorization_validity_too_short") — a 4-day window failed on Arc testnet,
 * since batched settlement must outlive Circle's ~7-day settlement/withdrawal windows. 30 days
 * gives ample margin. (Verified empirically against live Arc testnet, June 2026.)
 */
export const MAX_TIMEOUT_SECONDS = 2_592_000; // 30 days

export function buildRequirements(amountBaseUnits: string, payTo: string): PaymentRequirements {
  return {
    scheme: "exact",
    network: arcConfig.caip2,
    asset: arcConfig.usdcToken,
    amount: amountBaseUnits,
    payTo,
    maxTimeoutSeconds: MAX_TIMEOUT_SECONDS,
    extra: {
      name: "GatewayWalletBatched",
      version: "1",
      verifyingContract: arcConfig.gatewayWallet,
    },
  };
}

/** base64 of the PAYMENT-REQUIRED body returned with a 402. */
export function encodePaymentRequired(
  requirements: PaymentRequirements,
  endpoint: string,
  priceLabel: string,
): string {
  const body = {
    x402Version: 2,
    resource: {
      url: endpoint,
      description: `Paid resource (${priceLabel} USDC)`,
      mimeType: "application/json",
    },
    accepts: [requirements],
  };
  return Buffer.from(JSON.stringify(body)).toString("base64");
}

export function decodePaymentSignature(header: string): PaymentPayload {
  return JSON.parse(Buffer.from(header, "base64").toString("utf-8")) as PaymentPayload;
}

/** Pull the EIP-3009 nonce out of a payload, for replay/dupe guarding. */
export function payloadNonce(payload: PaymentPayload): string | undefined {
  const auth = (payload.payload as Record<string, unknown> | undefined)?.authorization as
    | Record<string, unknown>
    | undefined;
  const nonce = auth?.nonce ?? (payload.payload as Record<string, unknown> | undefined)?.nonce;
  return typeof nonce === "string" ? nonce : undefined;
}
