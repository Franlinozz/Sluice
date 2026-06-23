/**
 * @sluice/money — the ONE money helper.
 *
 * Rules (CLAUDE.md #5, #9):
 *  - PAYMENT USDC is ERC-20 with 6 decimals. All payment amounts, EIP-3009 values,
 *    and ledger math are 6-decimal integer base units stored as `bigint`.
 *  - Arc's NATIVE GAS token is USDC displayed with 18 decimals. It is a SEPARATE concept;
 *    never mix it with payment amounts. Native helpers are clearly namespaced.
 *  - Money in code is always integer base units (bigint). Float math on money is FORBIDDEN.
 *  - parse/format are backed by viem's parseUnits/formatUnits so values match EIP-3009 exactly.
 *  - bigint can't be JSON-serialized — use the tagged json helpers below at boundaries.
 */

import { parseUnits, formatUnits } from "viem";

// ── Decimal constants ────────────────────────────────────────────────────────
/** Decimals for ERC-20 USDC used for PAYMENTS. */
export const USDC_DECIMALS = 6 as const;
/** Decimals for Arc's NATIVE gas token display (USDC shown with 18 dp). */
export const NATIVE_DECIMALS = 18 as const;
export const USDC_SYMBOL = "USDC" as const;

/**
 * A payment amount in 6-decimal USDC base units.
 * Branded so a raw bigint (e.g. an 18-dp native value) can't be passed by accident.
 */
export type Usdc = bigint & { readonly __brand: "Usdc6" };

/** Cast a 6-dp base-unit bigint to the branded Usdc type (use only when you KNOW it's 6dp). */
export function asUsdc(base: bigint): Usdc {
  return base as Usdc;
}

export const ZERO_USDC = 0n as Usdc;

// ── Parsing (human string → base units) ──────────────────────────────────────
const HUMAN_AMOUNT_RE = /^-?\d+(\.\d+)?$/;

/**
 * Parse a human decimal string ("1.50", "0.000001", "$1.50") into 6-dp USDC base units.
 * Accepts an optional leading "$" and surrounding whitespace. Rejects float inputs and
 * scientific notation to keep money math exact (CLAUDE.md: never Number(x) * 1e6).
 */
export function parseUSDC(amount: string): Usdc {
  if (typeof amount !== "string") {
    throw new TypeError(
      `parseUSDC expects a string (got ${typeof amount}). Float money math is forbidden.`,
    );
  }
  const cleaned = amount.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!HUMAN_AMOUNT_RE.test(cleaned)) {
    throw new RangeError(`Invalid USDC amount: "${amount}"`);
  }
  return parseUnits(cleaned, USDC_DECIMALS) as Usdc;
}

/** Like parseUSDC but returns null instead of throwing — for user input validation. */
export function tryParseUSDC(amount: string): Usdc | null {
  try {
    return parseUSDC(amount);
  } catch {
    return null;
  }
}

// ── Formatting (base units → human string) ───────────────────────────────────
export interface FormatOptions {
  /** Always show at least this many fraction digits (default 2). */
  minFractionDigits?: number;
  /** Never show more than this many fraction digits (default 6 — full USDC precision). */
  maxFractionDigits?: number;
  /** Group the integer part with thousands separators (default true). */
  group?: boolean;
}

/**
 * Format 6-dp USDC base units to a plain decimal string (no symbol).
 * e.g. 1500000n → "1.50", 1n → "0.000001", 1234567000n → "1,234.567".
 */
export function formatUSDC(base: bigint, opts: FormatOptions = {}): string {
  const { minFractionDigits = 2, maxFractionDigits = 6, group = true } = opts;
  if (minFractionDigits < 0 || maxFractionDigits > USDC_DECIMALS || minFractionDigits > maxFractionDigits) {
    throw new RangeError("Invalid fraction-digit bounds for formatUSDC");
  }

  const negative = base < 0n;
  const abs = negative ? -base : base;

  // viem formatUnits gives an exact decimal string with trailing zeros trimmed.
  const raw = formatUnits(abs, USDC_DECIMALS); // e.g. "1.5", "1", "0.000001"
  const parts = raw.split(".");
  const intPartRaw = parts[0] ?? "0";
  const fracRaw = parts[1] ?? "";

  // Clamp fraction to maxFractionDigits (truncate — we never round money up silently).
  let frac = fracRaw.slice(0, maxFractionDigits);
  // Pad up to minFractionDigits.
  while (frac.length < minFractionDigits) frac += "0";

  const intPart = group ? groupThousands(intPartRaw) : intPartRaw;
  const sign = negative ? "-" : "";
  return frac.length > 0 ? `${sign}${intPart}.${frac}` : `${sign}${intPart}`;
}

/** Format with a leading "$" — the canonical UI amount, e.g. "$0.000001". */
export function formatUSD(base: bigint, opts?: FormatOptions): string {
  return `$${formatUSDC(base, opts)}`;
}

/** Format with a trailing " USDC" — e.g. "1.50 USDC". */
export function formatUSDCSuffixed(base: bigint, opts?: FormatOptions): string {
  return `${formatUSDC(base, opts)} ${USDC_SYMBOL}`;
}

function groupThousands(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ── Native gas (18-dp) — SEPARATE from payment USDC. Never mix. ──────────────
/**
 * Format Arc's native gas balance (18-dp USDC) for display, e.g. "0.9421".
 * Keep this away from payment amounts (CLAUDE.md #5).
 */
export function formatNative(base18: bigint, fractionDigits = 4): string {
  const raw = formatUnits(base18 < 0n ? -base18 : base18, NATIVE_DECIMALS);
  const parts = raw.split(".");
  const i = parts[0] ?? "0";
  const f = parts[1] ?? "";
  const frac = f.slice(0, fractionDigits).padEnd(fractionDigits, "0");
  const sign = base18 < 0n ? "-" : "";
  return fractionDigits > 0 ? `${sign}${groupThousands(i)}.${frac}` : `${sign}${groupThousands(i)}`;
}

// ── Arithmetic (bigint-native, with intent-revealing names) ──────────────────
/** Sum any number of base-unit amounts. */
export function sumUSDC(...amounts: bigint[]): Usdc {
  return amounts.reduce((a, b) => a + b, 0n) as Usdc;
}

/** unitPrice × count (count is a non-negative integer). */
export function priceTimesCount(unitPrice: bigint, count: number | bigint): Usdc {
  const c = typeof count === "bigint" ? count : BigInt(Math.trunc(count));
  if (c < 0n) throw new RangeError("count must be >= 0");
  return (unitPrice * c) as Usdc;
}

/** Clamp to >= 0 (e.g. remaining reserve must not go negative). */
export function clampNonNegative(base: bigint): Usdc {
  return (base < 0n ? 0n : base) as Usdc;
}

export function maxUSDC(a: bigint, b: bigint): Usdc {
  return (a > b ? a : b) as Usdc;
}
export function minUSDC(a: bigint, b: bigint): Usdc {
  return (a < b ? a : b) as Usdc;
}

// ── bigint ⇄ JSON (boundary helpers; CLAUDE.md #9) ───────────────────────────
// We tag bigints as { "$bigint": "<decimal>" } so they round-trip losslessly across JSON.
const BIGINT_TAG = "$bigint";

export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? { [BIGINT_TAG]: value.toString() } : value;
}

export function bigintReviver(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === "object" &&
    BIGINT_TAG in (value as Record<string, unknown>) &&
    Object.keys(value as object).length === 1
  ) {
    const raw = (value as Record<string, string>)[BIGINT_TAG];
    return typeof raw === "string" ? BigInt(raw) : value;
  }
  return value;
}

/** JSON.stringify that safely encodes bigints. */
export function stringifyJSON(value: unknown, space?: number): string {
  return JSON.stringify(value, bigintReplacer, space);
}

/** JSON.parse that restores bigints encoded by stringifyJSON. */
export function parseJSON<T = unknown>(text: string): T {
  return JSON.parse(text, bigintReviver) as T;
}

/** Convenience: plain decimal string of base units for storage in string columns. */
export function toBaseUnitString(base: bigint): string {
  return base.toString();
}
/** Convenience: parse a base-unit string column back to bigint. */
export function fromBaseUnitString(s: string): Usdc {
  return BigInt(s) as Usdc;
}
