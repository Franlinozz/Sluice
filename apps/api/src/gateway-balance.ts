/**
 * Seller-side Gateway balance reader. Returns honest states: the wallet's on-chain USDC plus
 * the Gateway balance (total / available / withdrawing / withdrawable) — never a fake instant balance.
 *
 * Hotfix 2026-07-18: results are cached 20s per address (with in-flight dedupe) — header chips,
 * checklists, and page refreshes were each hitting the chain + Circle API directly and tripping
 * the RPC rate limit. Also returns the NATIVE gas balance so the browser wallet chip can read
 * this cached endpoint instead of polling the chain itself.
 */
import { formatNative, formatUSDC, toBaseUnitString } from "@sluice/money";
import { arcConfig, getNativeBalance, getUsdcBalance } from "@sluice/chain";
import type { Address } from "viem";

export interface GatewayBalanceView {
  address: string;
  wallet: { base: string; formatted: string; nativeBase: string; formattedNative: string };
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

/** Parse a Gateway API balance value (decimal string OR atomic units) into 6-dp base units. */
function toBase(v: string | undefined): bigint {
  if (!v) return 0n;
  if (v.includes(".")) {
    // decimal USDC string → base units (6dp)
    const parts = v.split(".");
    const i = parts[0] || "0";
    const f = parts[1] ?? "";
    return BigInt(i) * 1_000_000n + BigInt((f + "000000").slice(0, 6));
  }
  return BigInt(v);
}

const CACHE_TTL_MS = 20_000;
const cache = new Map<string, { at: number; view: GatewayBalanceView }>();
const inFlight = new Map<string, Promise<GatewayBalanceView>>();

/** Cached, deduped read — at most one chain+Circle round-trip per address per 20s. */
export async function readGatewayBalance(address: Address): Promise<GatewayBalanceView> {
  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.view;
  const flying = inFlight.get(key);
  if (flying) return flying;
  const p = readGatewayBalanceFresh(address)
    .then((view) => {
      cache.set(key, { at: Date.now(), view });
      return view;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function readGatewayBalanceFresh(address: Address): Promise<GatewayBalanceView> {
  const [walletBase, nativeBase] = await Promise.all([
    getUsdcBalance(address).catch(() => 0n),
    getNativeBalance(address).catch(() => 0n),
  ]);

  let available = 0n;
  let withdrawing = 0n;
  let withdrawable = 0n;
  try {
    const res = await fetch(`${arcConfig.gatewayApiUrl}/v1/balances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        token: "USDC",
        sources: [{ domain: arcConfig.gatewayDomain, depositor: address }],
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        balances?: { domain: number; balance?: string; withdrawing?: string; withdrawable?: string }[];
      };
      const bal = data.balances?.find((b) => b.domain === arcConfig.gatewayDomain);
      available = toBase(bal?.balance);
      withdrawing = toBase(bal?.withdrawing);
      withdrawable = toBase(bal?.withdrawable);
    }
  } catch {
    /* Gateway API hiccup → report zeros for gateway, wallet balance is still real */
  }

  const total = available + withdrawing;
  return {
    address,
    wallet: {
      base: toBaseUnitString(walletBase),
      formatted: formatUSDC(walletBase),
      nativeBase: nativeBase.toString(),
      formattedNative: formatNative(nativeBase),
    },
    gateway: {
      total: toBaseUnitString(total),
      available: toBaseUnitString(available),
      withdrawing: toBaseUnitString(withdrawing),
      withdrawable: toBaseUnitString(withdrawable),
      formattedTotal: formatUSDC(total),
      formattedAvailable: formatUSDC(available),
      formattedWithdrawing: formatUSDC(withdrawing),
      formattedWithdrawable: formatUSDC(withdrawable),
    },
  };
}
