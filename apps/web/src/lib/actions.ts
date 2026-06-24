"use server";

import { revalidatePath } from "next/cache";
import { apiBase, type AgentDTO, type ReceiptDTO, type ResourceDTO, type RunDTO } from "./api";

async function call<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const r = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const data = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) return { ok: false, error: (data as { error?: string }).error ?? `HTTP ${r.status}` };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface RegisterResourceFields {
  name: string;
  description?: string;
  unitType: string;
  price: string;
  path: string;
}

export async function registerResourceAction(input: RegisterResourceFields) {
  const res = await call<ResourceDTO>("/resources", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (res.ok) {
    revalidatePath("/app/earn");
    revalidatePath("/app");
    revalidatePath("/app/discover");
  }
  return res;
}

export async function settleAction() {
  const res = await call<{ settled: number; receipts: ReceiptDTO[] }>("/settle", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (res.ok) {
    revalidatePath("/app/settlements");
    revalidatePath("/app");
  }
  return res;
}

export interface CreateAgentFields {
  name: string;
  task: string;
  budget: string;
  policy?: string;
}

export async function createAgentAction(input: CreateAgentFields) {
  const res = await call<AgentDTO>("/agents", { method: "POST", body: JSON.stringify(input) });
  if (res.ok) revalidatePath("/app/spend");
  return res;
}

export async function runAgentAction(agentId: string) {
  const res = await call<RunDTO>(`/agents/${agentId}/run`, { method: "POST" });
  if (res.ok) {
    revalidatePath("/app/spend");
    revalidatePath("/app/settlements");
    revalidatePath("/app");
  }
  return res;
}

export async function verifyReceiptAction(id: string) {
  const res = await call<{
    verified: boolean;
    status?: string;
    reason?: string;
    blockNumber?: string;
    explorerUrl?: string;
    settlementRef?: string[];
  }>(`/receipts/${id}/verify`, { method: "POST" });
  revalidatePath("/app/settlements");
  return res;
}
