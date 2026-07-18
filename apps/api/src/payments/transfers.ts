/**
 * Server-side reader for Circle Gateway transfers. settle() returns a transfer id that Circle
 * batches on-chain asynchronously; the reconciler polls these to resolve the real tx hash.
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { arcConfig } from "@sluice/chain";

let reader: GatewayClient | undefined;

function readerClient(): GatewayClient | undefined {
  // Transfers are created by the PAYER; Circle scopes reads to them, so prefer the buyer key.
  // (In production the platform queries its own transfers via its facilitator account.)
  const pk = (process.env.BUYER_PRIVATE_KEY ??
    process.env.ARC_WALLET_PRIVATE_KEY ??
    process.env.SELLER_PRIVATE_KEY) as `0x${string}` | undefined;
  if (!pk) return undefined;
  // rpcUrls[0] = healthiest backup (official endpoint rate-limits; hotfix 2026-07-18).
  return (reader ??= new GatewayClient({ chain: "arcTestnet", privateKey: pk, rpcUrl: arcConfig.rpcUrls[0] }));
}

export async function getTransfer(id: string): Promise<Record<string, unknown> | undefined> {
  const client = readerClient();
  if (!client) return undefined;
  return (await client.getTransferById(id)) as Record<string, unknown>;
}

/** Find a 0x[64-hex] field anywhere in the transfer (the on-chain tx hash, once batched). */
export function extractTxHash(t: Record<string, unknown>): string | undefined {
  for (const v of Object.values(t)) {
    if (typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v)) return v;
  }
  return undefined;
}

export type TransferOutcome = "settled" | "failed" | "pending";

export function transferOutcome(t: Record<string, unknown>): TransferOutcome {
  const s = String(t.status);
  if (s === "confirmed" || s === "completed") return "settled";
  if (s === "failed") return "failed";
  return "pending"; // received | batched | (anything not terminal)
}
