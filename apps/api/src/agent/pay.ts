/**
 * The agent's payment arm — the funded buyer wallet pays through our own x402 paywall
 * (GatewayClient handles 402 → sign → retry). Deposit-aware.
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";

let buyer: GatewayClient | undefined;

function buyerClient(): GatewayClient | undefined {
  const pk = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as
    | `0x${string}`
    | undefined;
  if (!pk) return undefined;
  return (buyer ??= new GatewayClient({ chain: "arcTestnet", privateKey: pk }));
}

export function buyerAddress(): string | undefined {
  return buyerClient()?.address;
}

/** Top up the Gateway balance if it's below `minBase` (6-dp base units). */
export async function ensureDeposit(minBase: bigint): Promise<void> {
  const c = buyerClient();
  if (!c) return;
  try {
    const bal = await c.getBalances();
    if (bal.gateway.available < minBase) await c.deposit("0.5");
  } catch {
    /* deposit best-effort; pay will surface a clear error if balance is insufficient */
  }
}

export interface PayOutcome {
  ok: boolean;
  amount?: string;
  error?: string;
}

export async function payResource(path: string): Promise<PayOutcome> {
  const c = buyerClient();
  if (!c) return { ok: false, error: "no buyer wallet configured" };
  const port = process.env.API_PORT ?? "3001";
  const url = `http://127.0.0.1:${port}/paid/${path}`;
  try {
    const res = await c.pay<{ status: string }>(url);
    return { ok: true, amount: res.formattedAmount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
