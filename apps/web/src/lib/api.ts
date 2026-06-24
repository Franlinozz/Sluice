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
  author?: string | null;
  contentUrl?: string | null;
  sourceType?: string | null;
  splits?: { label: string; wallet: string; pct: number }[] | null;
  splitterAddress?: string | null;
  splitterUrl?: string | null;
  feedId?: string | null;
  earned?: string;
  formattedEarned?: string;
  rslUrl?: string;
  llmsTxtUrl?: string;
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

export interface DecisionDTO {
  id: string;
  resourceId: string | null;
  resourceName: string;
  decision: "pay" | "skip" | "capped";
  relevance: number;
  reason: string;
  amount: string | null;
  formattedAmount: string | null;
  paid: boolean;
  createdAt: string;
}

export interface RunDTO {
  id: string;
  agentId: string;
  status: "running" | "paused" | "completed" | "failed";
  spent: string;
  formattedSpent: string;
  value: number;
  avgRelevance: number | null;
  steps: number;
  mode: "live" | "mock";
  note: string | null;
  paidCount: number | null;
  startedAt: string;
  finishedAt: string | null;
  decisions?: DecisionDTO[];
}

export interface AgentRulesDTO {
  priceCeiling: string | null;
  formattedPriceCeiling: string | null;
  allowedUnitTypes: string[] | null;
  topics: string[];
  relevanceThreshold: number;
}

export interface AgentDTO {
  id: string;
  name: string;
  task: string;
  budget: string;
  formattedBudget: string;
  policy: string | null;
  rules: AgentRulesDTO;
  buyer: string | null;
  createdAt: string;
  latestRun?: RunDTO | null;
}

export interface SplitBreakdownDTO {
  label: string;
  wallet: string;
  pct: number;
  amount: string;
}

export interface ResearchCitationDTO {
  marker: number;
  resourceName: string;
  sourceUrl: string | null;
  author: string | null;
  amount: string;
  formattedAmount: string;
  settlementType: "gateway" | "onchain";
  txHash: string | null;
  explorerUrl: string | null;
  splits: SplitBreakdownDTO[] | null;
}

export interface ResearchResultDTO {
  id: string;
  question: string;
  answer: string;
  mode: "live" | "mock";
  totalPaid: string;
  formattedTotalPaid: string;
  citations: ResearchCitationDTO[];
}

export interface StreamSessionDTO {
  id: string;
  resourceId: string;
  payer: string;
  rate: string;
  reserve: string;
  status: "flowing" | "paused" | "stopped";
  flowPaused: boolean;
  flowedSeconds: number;
  flowedMs: number;
  accrued: string;
  reserveRemaining: string;
  capped: boolean;
  heartbeatFresh: boolean;
  settledSeconds: number | null;
  settledAmount: string | null;
  receiptId: string | null;
  startedAt: string;
  stoppedAt: string | null;
  formattedRate: string;
  formattedReserve: string;
  formattedAccrued: string;
  formattedReserveRemaining: string;
  formattedSettledAmount: string | null;
}

export type MatchStatus = "active" | "released" | "slashed";

export interface MatchDTO {
  id: string;
  matchId: string;
  matchIdShort: string;
  resourceId: string | null;
  need: string;
  providerWallet: string;
  beneficiaryWallet: string;
  agentId: number | null;
  amount: string;
  formattedAmount: string;
  status: MatchStatus;
  reason: string | null;
  approveTx: string | null;
  postTx: string | null;
  resolveTx: string | null;
  feedbackTx: string | null;
  postTxUrl: string | null;
  resolveTxUrl: string | null;
  feedbackTxUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
  onchain?: {
    broker: string;
    provider: string;
    beneficiary: string;
    amount: string;
    status: number;
    statusLabel: string;
    createdAt: number;
    resolvedAt: number;
    reason: string;
  } | null;
}

export interface ProviderReputationDTO {
  provider: string;
  matches: number;
  slashes: number;
  reliabilityBps: number;
  bonded: string;
  active: string;
  slashed: string;
  released: string;
  formattedBonded: string;
  formattedActive: string;
  formattedSlashed: string;
  formattedReleased: string;
  reliabilityPct: number;
  feedbackAverage: number;
  feedbackCount: number;
}

export interface ContractsDTO {
  ready: boolean;
  chainId?: number;
  explorer?: string;
  deployedAt?: string;
  contracts?: {
    identityRegistry: { address: string; url: string };
    reputationRegistry: { address: string; url: string };
    bondEscrow: { address: string; url: string };
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
  agents: () => getJSON<AgentDTO[]>("/agents"),
  agent: (id: string) => getJSON<AgentDTO>(`/agents/${id}`),
  session: (id: string) => getJSON<StreamSessionDTO>(`/sessions/${id}`),
  matches: () => getJSON<MatchDTO[]>("/matches"),
  match: (id: string) => getJSON<MatchDTO>(`/matches/${id}`),
  reputation: (agentId?: number) =>
    getJSON<ProviderReputationDTO>(agentId ? `/reputation?agentId=${agentId}` : "/reputation"),
  contracts: () => getJSON<ContractsDTO>("/contracts"),
};

export const apiBase = BASE;
