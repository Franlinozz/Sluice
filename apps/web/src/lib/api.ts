/**
 * Server-side client for the Sluice API (apps/api). Used by Server Components + server actions
 * so the browser never calls the VPS API directly (avoids https→http mixed content on Vercel).
 */
const BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface Kpis {
  totalSettled: string;
  batchingAmount: string;
  unitsMetered: number;
  resources: number;
  settlements: number;
  batching: number;
  payers: number;
  pendingAccruals: number;
  formattedTotalSettled: string;
  formattedBatchingAmount: string;
}

export type ReceiptStatus = "batching" | "settled" | "failed";

export interface ReceiptDTO {
  id: string;
  resourceId: string;
  payer: string;
  unitType: string;
  units: number;
  rate: string;
  grossAmount: string;
  formattedRate: string;
  formattedAmount: string;
  batchTxHash: string | null;
  explorerUrl: string | null;
  settlementRef: string[];
  backend: "gateway" | "direct";
  status: ReceiptStatus;
  createdAt: string;
  settledAt: string | null;
}

export interface ResourceDTO {
  id: string;
  name: string;
  description: string | null;
  unitType: string;
  unitPrice: string;
  formattedPrice: string;
  rateLabel: string;
  payTo: string;
  path: string;
  status: string;
  createdAt: string;
  endpoint: string;
}

export interface GatewayBalanceDTO {
  address: string;
  wallet: { base: string; formatted: string };
  gateway: {
    total: string;
    available: string;
    withdrawing: string;
    withdrawable: string;
    formattedTotal: string;
    formattedAvailable: string;
    formattedWithdrawing: string;
    formattedWithdrawable: string;
  };
}

async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const sluiceApi = {
  kpis: () => getJSON<Kpis>("/kpis"),
  receipts: () => getJSON<ReceiptDTO[]>("/receipts"),
  resources: () => getJSON<ResourceDTO[]>("/resources"),
  gatewayBalance: (address?: string) =>
    getJSON<GatewayBalanceDTO>(
      address ? `/gateway/balance?address=${encodeURIComponent(address)}` : "/gateway/balance",
    ),
};

export const apiBase = BASE;
