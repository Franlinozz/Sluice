import { test } from "node:test";
import assert from "node:assert/strict";
import { arcConfig, arcTestnet, explorerTxUrl, explorerAddressUrl } from "./index.ts";

test("arcConfig has the verified Arc-testnet constants", () => {
  assert.equal(arcConfig.chainId, 5042002);
  assert.equal(arcConfig.caip2, "eip155:5042002");
  assert.equal(arcConfig.usdcToken.toLowerCase(), "0x3600000000000000000000000000000000000000");
  assert.equal(
    arcConfig.gatewayWallet.toLowerCase(),
    "0x0077777d7eba4688bdef3e311b846f25870a19b9",
  );
  assert.equal(arcConfig.gatewayDomain, 26);
  assert.equal(arcConfig.nativeDecimals, 18);
});

test("viem chain matches config (assert on id, never symbol)", () => {
  assert.equal(arcTestnet.id, 5042002);
  assert.equal(arcTestnet.testnet, true);
  assert.ok(arcTestnet.rpcUrls.default.http[0]?.startsWith("https://"));
});

test("explorer link helpers", () => {
  assert.equal(explorerTxUrl("0xabc"), "https://testnet.arcscan.app/tx/0xabc");
  assert.equal(explorerAddressUrl("0xdef"), "https://testnet.arcscan.app/address/0xdef");
});
