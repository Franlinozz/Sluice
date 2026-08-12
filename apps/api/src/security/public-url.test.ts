import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicHttpUrl, isPrivateOrReservedIp } from "./public-url.ts";

test("rejects private, loopback, link-local and metadata destinations", async () => {
  const blocked = [
    "http://127.0.0.1/admin",
    "http://10.1.2.3/",
    "http://172.16.4.2/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[::ffff:7f00:1]/",
    "http://localhost/",
    "http://service.internal/",
  ];
  for (const url of blocked) await assert.rejects(assertPublicHttpUrl(url), /public host|public addresses/);
});

test("rejects unsafe protocols and URL credentials", async () => {
  await assert.rejects(assertPublicHttpUrl("file:///etc/passwd"), /http or https/);
  await assert.rejects(assertPublicHttpUrl("https://user:pass@8.8.8.8/"), /credentials/);
});

test("accepts a literal public address without DNS", async () => {
  assert.equal((await assertPublicHttpUrl("https://8.8.8.8/example")).hostname, "8.8.8.8");
});

test("classifies reserved address ranges", () => {
  assert.equal(isPrivateOrReservedIp("100.64.0.1"), true);
  assert.equal(isPrivateOrReservedIp("198.51.100.10"), true);
  assert.equal(isPrivateOrReservedIp("::ffff:127.0.0.1"), true);
  assert.equal(isPrivateOrReservedIp("::ffff:7f00:1"), true);
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIp("2606:4700:4700::1111"), false);
});
