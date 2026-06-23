import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseUSDC,
  tryParseUSDC,
  formatUSDC,
  formatUSD,
  formatUSDCSuffixed,
  formatNative,
  sumUSDC,
  priceTimesCount,
  clampNonNegative,
  stringifyJSON,
  parseJSON,
  ZERO_USDC,
} from "./index.ts";

test("parseUSDC: exact 6-dp base units", () => {
  assert.equal(parseUSDC("1.50"), 1_500_000n);
  assert.equal(parseUSDC("1"), 1_000_000n);
  assert.equal(parseUSDC("0.000001"), 1n); // one micro-USDC (smallest unit)
  assert.equal(parseUSDC("$1,234.56"), 1_234_560_000n);
  assert.equal(parseUSDC("0"), 0n);
});

test("parseUSDC: rejects floats, junk, and scientific notation", () => {
  assert.throws(() => parseUSDC("1e-6"));
  assert.throws(() => parseUSDC("abc"));
  assert.throws(() => parseUSDC(""));
  // @ts-expect-error — numbers are forbidden at the type level too
  assert.throws(() => parseUSDC(0.000001));
});

test("tryParseUSDC: null on bad input", () => {
  assert.equal(tryParseUSDC("nope"), null);
  assert.equal(tryParseUSDC("2.5"), 2_500_000n);
});

test("formatUSDC: micro amounts shown in full, normal amounts clean", () => {
  assert.equal(formatUSDC(1n), "0.000001");
  assert.equal(formatUSDC(1_500_000n), "1.50");
  assert.equal(formatUSDC(1_000_000n), "1.00");
  assert.equal(formatUSDC(1_234_567_000n), "1,234.567");
  assert.equal(formatUSDC(0n), "0.00");
});

test("formatUSDC: truncates beyond 6dp bounds, never silently rounds up", () => {
  // 1.2345678 isn't representable in 6dp; parse would round at parse-time via viem,
  // but format of an exact base-unit value must be faithful.
  assert.equal(formatUSDC(1_234_567n), "1.234567");
  assert.equal(formatUSDC(1_234_560n), "1.23456");
});

test("formatUSD / suffixed", () => {
  assert.equal(formatUSD(1n), "$0.000001");
  assert.equal(formatUSDCSuffixed(2_500_000n), "2.50 USDC");
});

test("negatives format with a single leading minus", () => {
  assert.equal(formatUSDC(-1_500_000n), "-1.50");
  assert.equal(formatUSD(-1n), "$-0.000001");
});

test("native 18-dp formatting is separate from payment USDC", () => {
  // 0.9421 native USDC (gas) — 18 decimals
  assert.equal(formatNative(942_100_000_000_000_000n), "0.9421");
  assert.equal(formatNative(1_000_000_000_000_000_000n), "1.0000");
});

test("arithmetic is bigint-native and exact", () => {
  assert.equal(sumUSDC(1n, 2n, 3n), 6n);
  assert.equal(priceTimesCount(1000n, 5), 5000n); // $0.001 × 5
  assert.equal(clampNonNegative(-5n), 0n);
  assert.equal(ZERO_USDC, 0n);
});

test("bigint round-trips losslessly through JSON", () => {
  const ledger = { payer: "0xabc", accrued: 123_456_789n, count: 42 };
  const json = stringifyJSON(ledger);
  const back = parseJSON<typeof ledger>(json);
  assert.equal(back.accrued, 123_456_789n);
  assert.equal(typeof back.accrued, "bigint");
  assert.equal(back.count, 42);
  assert.equal(back.payer, "0xabc");
});
