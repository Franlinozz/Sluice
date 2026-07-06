/**
 * In-app faucet: one small dispensation of Arc-testnet USDC per HUMAN, so a new joiner gets from
 * zero to a real paid action in minutes (Circle's external faucet drips ~1 USDC/day with sign-in
 * friction — that gap is where new users fall off).
 *
 * Honesty + rule 16:
 * - One claim per PROFILE (linked wallets share it) AND per wallet — no way to farm by re-linking.
 * - The drip is a REAL on-chain native transfer from the operator wallet (on Arc the native gas
 *   token IS USDC, so one transfer funds both payments and gas). txHash links to Arcscan.
 * - Wallets that already hold funds are refused (the faucet is a bootstrap, not income).
 * - The operator keeps a reserve floor; when it can't afford a drip it says so honestly.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { formatEther, parseEther, type Address, type Hex } from "viem";
import { getClient, getNativeBalance, getWalletClient } from "@sluice/chain";
import { db } from "../db/client.ts";
import { faucetClaims } from "../db/schema.ts";
import { profileById, walletsOf } from "./profiles.ts";

/** $0.25 — funds 25–250 typical Sluice actions ($0.001–$0.01) without draining the pool. */
const DRIP_USDC = process.env.FAUCET_AMOUNT_USDC ?? "0.25";
/** Refuse wallets already holding more than this (native, 18dp display units). */
const RICH_FLOOR_USDC = process.env.FAUCET_RICH_FLOOR_USDC ?? "1";
/** Never drip the operator below this reserve. */
const OPERATOR_RESERVE_USDC = process.env.FAUCET_OPERATOR_RESERVE_USDC ?? "20";

const EXPLORER_TX = `${process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app"}/tx/`;

/** 6dp base units for the ledger row (payment-side convention). */
const DRIP_BASE_6DP = String(Math.round(Number(DRIP_USDC) * 1e6));

function operatorKey(): Hex | undefined {
  return (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex | undefined;
}

export interface FaucetStatus {
  amount: string; // display USDC
  eligible: boolean;
  reason?: string;
  claim?: { txHash: string; explorerUrl: string; amount: string; at: number };
}

function priorClaim(profileId: string, wallet: string) {
  const byWallet = db.select().from(faucetClaims).where(eq(faucetClaims.wallet, wallet)).get();
  if (byWallet) return byWallet;
  return db.select().from(faucetClaims).where(eq(faucetClaims.profileId, profileId)).get();
}

/** Pure read: is this profile+wallet eligible, and if not, exactly why. */
export async function faucetStatus(profileId: string, wallet: string): Promise<FaucetStatus> {
  const w = wallet.toLowerCase();
  const base: Omit<FaucetStatus, "eligible"> = { amount: DRIP_USDC };

  const profile = profileById(profileId);
  if (!profile) return { ...base, eligible: false, reason: "profile not found" };
  if (!walletsOf(profileId).includes(w)) return { ...base, eligible: false, reason: "wallet is not linked to this profile" };

  const prior = priorClaim(profileId, w);
  if (prior) {
    return {
      ...base,
      eligible: false,
      reason: "already claimed — one claim per person (linked wallets share it)",
      claim: {
        txHash: prior.txHash,
        explorerUrl: `${EXPLORER_TX}${prior.txHash}`,
        amount: (Number(prior.amount) / 1e6).toString(),
        at: prior.createdAt.getTime(),
      },
    };
  }

  const balance = await getNativeBalance(w as Address).catch(() => null);
  if (balance === null) return { ...base, eligible: false, reason: "could not read wallet balance — try again" };
  if (balance > parseEther(RICH_FLOOR_USDC)) {
    return { ...base, eligible: false, reason: `wallet already holds ${Number(formatEther(balance)).toFixed(2)} USDC — the faucet is for empty wallets` };
  }

  const key = operatorKey();
  if (!key) return { ...base, eligible: false, reason: "faucet is not configured" };
  const operator = getWalletClient(key).account!.address;
  const opBalance = await getNativeBalance(operator).catch(() => 0n);
  if (opBalance < parseEther(OPERATOR_RESERVE_USDC) + parseEther(DRIP_USDC)) {
    return { ...base, eligible: false, reason: "faucet pool is low right now — try Circle's faucet instead" };
  }

  return { ...base, eligible: true };
}

/** Serialize claims per profile so a double-click can't race two drips. */
const inFlight = new Set<string>();

export async function claimFaucet(profileId: string, wallet: string): Promise<FaucetStatus & { txHash?: string; explorerUrl?: string }> {
  const w = wallet.toLowerCase();
  if (inFlight.has(profileId) || inFlight.has(w)) {
    return { amount: DRIP_USDC, eligible: false, reason: "a claim is already in progress" };
  }
  inFlight.add(profileId);
  inFlight.add(w);
  try {
    const status = await faucetStatus(profileId, w);
    if (!status.eligible) return status;

    const op = getWalletClient(operatorKey()!);
    const txHash = await op.sendTransaction({
      to: w as Address,
      value: parseEther(DRIP_USDC),
      account: op.account!,
      chain: op.chain,
    } as never);
    await getClient().waitForTransactionReceipt({ hash: txHash });

    db.insert(faucetClaims).values({ id: randomUUID(), profileId, wallet: w, amount: DRIP_BASE_6DP, txHash }).run();

    return {
      amount: DRIP_USDC,
      eligible: false,
      reason: "claimed",
      txHash,
      explorerUrl: `${EXPLORER_TX}${txHash}`,
      claim: { txHash, explorerUrl: `${EXPLORER_TX}${txHash}`, amount: DRIP_USDC, at: Date.now() },
    };
  } finally {
    inFlight.delete(profileId);
    inFlight.delete(w);
  }
}
