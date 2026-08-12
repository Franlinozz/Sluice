import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.aws.internal",
]);

function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function ipv4Number(address: string): number {
  return address.split(".").reduce((value, octet) => (value << 8) + Number(octet), 0) >>> 0;
}

function inV4Range(address: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(base) & mask);
}

function ipv6Words(address: string): number[] | null {
  let value = address.toLowerCase();
  if (value.includes(".")) {
    const at = value.lastIndexOf(":");
    const v4 = value.slice(at + 1);
    if (isIP(v4) !== 4) return null;
    const n = ipv4Number(v4);
    value = `${value.slice(0, at)}:${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const words = [...left, ...Array.from({ length: missing }, () => "0"), ...right].map((word) =>
    Number.parseInt(word, 16),
  );
  return words.length === 8 && words.every((word) => Number.isInteger(word) && word >= 0 && word <= 0xffff)
    ? words
    : null;
}

/** True for addresses that must never be reached by a public, user-configured connector. */
export function isPrivateOrReservedIp(address: string): boolean {
  const host = normalizedHost(address);
  const version = isIP(host);
  if (version === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([base, bits]) => inV4Range(host, base as string, bits as number));
  }
  if (version === 6) {
    const words = ipv6Words(host);
    if (!words) return true;
    const [a, b, c, d, e, f, g, h] = words as [number, number, number, number, number, number, number, number];
    if (words.slice(0, 7).every((word) => word === 0) && (h === 0 || h === 1)) return true;
    if ((a & 0xfe00) === 0xfc00 || (a & 0xffc0) === 0xfe80 || (a & 0xff00) === 0xff00) return true;
    if (a === 0x2001 && b === 0x0db8) return true;
    if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && (f === 0 || f === 0xffff)) {
      return isPrivateOrReservedIp(`${g >>> 8}.${g & 0xff}.${h >>> 8}.${h & 0xff}`);
    }
    return false;
  }
  return true;
}

/** Parse and resolve an outbound URL, refusing local/private/reserved destinations. */
export async function assertPublicHttpUrl(input: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URL must be valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL must use http or https");
  }
  if (url.username || url.password) throw new Error("URL must not contain credentials");

  const host = normalizedHost(url.hostname);
  if (
    BLOCKED_HOSTS.has(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("URL must resolve to a public host");
  }

  if (isIP(host)) {
    if (isPrivateOrReservedIp(host)) throw new Error("URL must resolve to a public host");
    return url;
  }

  let addresses: LookupAddress[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("URL host could not be resolved");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw new Error("URL must resolve only to public addresses");
  }
  return url;
}

/** Fetch a public URL while validating every redirect hop. */
export async function fetchPublicUrl(input: string, init: RequestInit = {}, redirects = 3): Promise<Response> {
  let url = await assertPublicHttpUrl(input);
  for (let hop = 0; ; hop += 1) {
    const response = await fetch(url, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (hop >= redirects) throw new Error("too many redirects");
    const location = response.headers.get("location");
    if (!location) throw new Error("redirect response omitted location");
    url = await assertPublicHttpUrl(new URL(location, url).toString());
  }
}
