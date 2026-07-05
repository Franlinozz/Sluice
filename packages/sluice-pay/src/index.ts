/**
 * @sluice/pay — pay any Sluice / x402 resource on Arc in one call.
 *
 * Wraps Circle's GatewayClient (gas-free batched nanopayments) plus the Sluice registry so an agent
 * can discover a resource and pay for it with budget + reasoning guards. Deposit-aware: it checks the
 * Gateway balance before paying and fails with an actionable error instead of a cryptic revert.
 *
 * Every payment here is REAL (CLAUDE.md: no fakes) — a signed x402 authorization settled by Circle.
 *
 * @example
 * ```ts
 * import { SluicePay } from "@sluice/pay";
 * const sluice = new SluicePay({ privateKey: process.env.PK as `0x${string}` });
 * const [r] = await sluice.discover();
 * const { data, amount } = await sluice.pay(r.id, { maxAmount: 0.01, reason: "ground my answer" });
 * console.log(`paid ${amount} USDC for ${r.name}`, data);
 * ```
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";
import type { Address, Hex } from "viem";

export const DEFAULT_API_BASE = "https://sluice-six.vercel.app/gw";

export interface SluiceResource {
  id: string;
  name: string;
  description: string | null;
  unitType: string;
  /** price per unit in 6-dp USDC base units (string) */
  unitPrice: string;
  formattedPrice: string;
  rateLabel?: string;
  payTo: string;
  path: string;
  /** absolute URL of the x402-protected endpoint */
  url: string;
}

export interface SluicePayOptions {
  /** Payer private key (the agent's wallet). */
  privateKey: Hex;
  /** Gateway chain name (default "arcTestnet"). */
  chain?: string;
  /** Sluice registry base URL (default the public Sluice API). */
  apiBase?: string;
  /** Optional cumulative budget cap across all pay() calls, in USDC (e.g. 0.5). */
  budget?: number;
  /** If true, auto-deposit the shortfall into the Gateway when balance is too low. Default false. */
  autoDeposit?: boolean;
}

export interface PayDecision {
  url: string;
  resource?: SluiceResource;
  /** best-effort expected unit price in base units */
  priceBase: bigint;
  formattedPrice?: string;
  reason?: string;
  /** USDC already spent by this client so far (base units) */
  spentBase: bigint;
}

export interface PayParams {
  /** Per-call ceiling in USDC — abort if the resource price exceeds it. */
  maxAmount?: number;
  /** Free-text reason, surfaced to the reasoning hook. */
  reason?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Reasoning hook — return false (or throw) to abort before paying. */
  onDecision?: (d: PayDecision) => boolean | Promise<boolean>;
}

export interface PayResult<T = unknown> {
  data: T;
  /** formatted amount actually paid */
  amount: string;
  resource?: SluiceResource;
}

export interface BalanceView {
  address: Address;
  available: bigint;
  formattedAvailable: string;
  total: bigint;
  formattedTotal: string;
}

function usdcToBase(usdc: number): bigint {
  return BigInt(Math.round(usdc * 1_000_000));
}

export class SluicePayError extends Error {
  constructor(
    message: string,
    readonly code:
      | "insufficient_balance"
      | "over_budget"
      | "over_max"
      | "aborted"
      | "not_found"
      | "network",
  ) {
    super(message);
    this.name = "SluicePayError";
  }
}

export class SluicePay {
  readonly client: GatewayClient;
  readonly apiBase: string;
  private readonly budgetBase: bigint | null;
  private readonly autoDeposit: boolean;
  private spentBase = 0n;

  constructor(opts: SluicePayOptions) {
    this.client = new GatewayClient({
      chain: (opts.chain ?? "arcTestnet") as never,
      privateKey: opts.privateKey,
    });
    this.apiBase = (opts.apiBase ?? DEFAULT_API_BASE).replace(/\/$/, "");
    this.budgetBase = opts.budget != null ? usdcToBase(opts.budget) : null;
    this.autoDeposit = Boolean(opts.autoDeposit);
  }

  get address(): Address {
    return this.client.address;
  }

  /** USDC spent across all pay() calls so far (base units). */
  totalSpent(): bigint {
    return this.spentBase;
  }

  private async getJSON<T>(path: string): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new SluicePayError(`registry ${res.status} for ${path}`, "network");
    return (await res.json()) as T;
  }

  private toResource(r: Record<string, unknown>): SluiceResource {
    const path = String(r.path);
    return {
      id: String(r.id),
      name: String(r.name),
      description: (r.description as string | null) ?? null,
      unitType: String(r.unitType),
      unitPrice: String(r.unitPrice),
      formattedPrice: String(r.formattedPrice ?? ""),
      rateLabel: r.rateLabel ? String(r.rateLabel) : undefined,
      payTo: String(r.payTo),
      path,
      url: `${this.apiBase}/paid/${path}`,
    };
  }

  /** List all priced resources in the Sluice registry. */
  async discover(): Promise<SluiceResource[]> {
    const rows = await this.getJSON<Record<string, unknown>[]>("/resources");
    return rows.map((r) => this.toResource(r));
  }

  /** Resolve a single resource by id. */
  async getResource(id: string): Promise<SluiceResource | undefined> {
    try {
      const r = await this.getJSON<Record<string, unknown>>(`/resources/${id}`);
      return this.toResource(r);
    } catch {
      return undefined;
    }
  }

  /** Best-effort unit price for a resource id (base units + formatted). */
  async getPrice(id: string): Promise<{ base: bigint; formatted: string } | undefined> {
    const r = await this.getResource(id);
    if (!r) return undefined;
    return { base: BigInt(r.unitPrice), formatted: r.formattedPrice };
  }

  /** Gateway balance for the payer (deposit-aware checks use this). */
  async balance(): Promise<BalanceView> {
    const b = await this.client.getBalances();
    return {
      address: this.client.address,
      available: b.gateway.available,
      formattedAvailable: b.gateway.formattedAvailable,
      total: b.gateway.available + b.gateway.withdrawing,
      formattedTotal: b.gateway.formattedTotal ?? b.gateway.formattedAvailable,
    };
  }

  /** Deposit USDC into the Gateway so the agent can pay. Returns the deposit tx hash. */
  async deposit(amountUsdc: string): Promise<string> {
    const res = await this.client.deposit(amountUsdc);
    return res.depositTxHash;
  }

  /**
   * Pay for a Sluice/x402 resource by id (resolved via the registry) or by absolute URL.
   * Enforces per-call max, cumulative budget, deposit sufficiency, and an optional reasoning hook —
   * then makes a real x402 payment settled by Circle Gateway.
   */
  async pay<T = unknown>(idOrUrl: string, params: PayParams = {}): Promise<PayResult<T>> {
    const isUrl = /^https?:\/\//.test(idOrUrl);
    let resource: SluiceResource | undefined;
    let url = idOrUrl;
    let priceBase = 0n;
    let formattedPrice: string | undefined;

    if (!isUrl) {
      resource = await this.getResource(idOrUrl);
      if (!resource) throw new SluicePayError(`resource not found: ${idOrUrl}`, "not_found");
      url = resource.url;
      priceBase = BigInt(resource.unitPrice);
      formattedPrice = resource.formattedPrice;
    }

    // Per-call ceiling.
    if (params.maxAmount != null && priceBase > 0n && priceBase > usdcToBase(params.maxAmount)) {
      throw new SluicePayError(
        `price ${formattedPrice} exceeds maxAmount ${params.maxAmount}`,
        "over_max",
      );
    }
    // Cumulative budget.
    if (this.budgetBase != null && priceBase > 0n && this.spentBase + priceBase > this.budgetBase) {
      throw new SluicePayError("cumulative budget exceeded", "over_budget");
    }

    // Reasoning hook.
    if (params.onDecision) {
      const ok = await params.onDecision({
        url,
        resource,
        priceBase,
        formattedPrice,
        reason: params.reason,
        spentBase: this.spentBase,
      });
      if (!ok) throw new SluicePayError("payment aborted by onDecision", "aborted");
    }

    // Deposit-aware: ensure the Gateway has enough to cover the price.
    if (priceBase > 0n) {
      const bal = await this.balance();
      if (bal.available < priceBase) {
        if (this.autoDeposit) {
          const shortfallUsdc = Number(priceBase - bal.available) / 1e6;
          await this.deposit((shortfallUsdc + 0.01).toFixed(6));
        } else {
          throw new SluicePayError(
            `insufficient Gateway balance (${bal.formattedAvailable} USDC). Call deposit() first or set autoDeposit:true.`,
            "insufficient_balance",
          );
        }
      }
    }

    const res = await this.client.pay<T>(url, {
      method: params.method,
      body: params.body,
      headers: params.headers,
    });

    // res.amount is atomic (6-dp) USDC; res.formattedAmount is the display string.
    this.spentBase += res.amount ?? priceBase;

    return { data: res.data, amount: res.formattedAmount, resource };
  }

  /** Recent settlement receipts from the registry. */
  async receipts(): Promise<unknown[]> {
    return this.getJSON<unknown[]>("/receipts");
  }
}

export default SluicePay;
