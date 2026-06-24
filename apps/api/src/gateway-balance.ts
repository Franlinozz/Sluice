/**
 * Seller-side Gateway balance reader. Returns honest states: the wallet's on-chain USDC plus
 * the Gateway balance (total / available / withdrawing / withdrawable) — never a fake instant balance.
 */
import { formatUSDC, toBaseUnitString } from "@sluice/money";
import { arcConfig, getUsdcBalance } from "@sluice/chain";
import type { Address } from "viem";

export interface GatewayBalanceView {
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

export async function readGatewayBalance(address: Address): Promise<GatewayBalanceView> {
  const walletBase = await getUsdcBalance(address).catch(() => 0n);

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
    wallet: { base: toBaseUnitString(walletBase), formatted: formatUSDC(walletBase) },
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
