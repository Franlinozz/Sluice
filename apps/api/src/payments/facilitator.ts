/**
 * Circle Gateway facilitator wrapper. verify() and settle() are SEPARATE — the Meter verifies
 * on request (instant resource) and defers settle() to a batch trigger.
 */
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";
import type { PaymentPayload, PaymentRequirements } from "./requirements.ts";

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}
export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction: string;
  network: string;
}

let client: BatchFacilitatorClient | undefined;
export function facilitator(): BatchFacilitatorClient {
  return (client ??= new BatchFacilitatorClient());
}

export async function verifyPayment(
  payload: PaymentPayload,
  requirements: PaymentRequirements,
): Promise<VerifyResponse> {
  return facilitator().verify(payload as never, requirements) as Promise<VerifyResponse>;
}

export async function settlePayment(
  payload: PaymentPayload,
  requirements: PaymentRequirements,
): Promise<SettleResponse> {
  return facilitator().settle(payload as never, requirements) as Promise<SettleResponse>;
}
