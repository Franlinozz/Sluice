/**
 * Cross-team exchange kit (R5): OTHER teams list their x402 endpoints on the Sluice Bazaar —
 * with their consent (they register), validated by a real probe (the endpoint must answer 402
 * with x402 payment requirements). Partner endpoints become resources with
 * metadata.externalUrl; the buyer agent pays THAT URL directly, so Sluice agents genuinely pay
 * other teams' services on Arc. Their receipts live on their side; our side records the paid
 * decision + amount.
 */
import { registerResource } from "../registry.ts";
import { listAllResources } from "../registry.ts";

export interface PartnerInput {
  name: string;
  endpointUrl: string;
  team: string;
  contact?: string;
  description?: string;
}

export interface ProbeResult {
  ok: boolean;
  status?: number;
  scheme?: string;
  error?: string;
}

/** Probe: a real x402 endpoint answers 402 with machine-readable payment requirements. */
export async function probeX402(url: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    if (res.status !== 402) {
      return { ok: false, status: res.status, error: `expected 402 Payment Required, got ${res.status}` };
    }
    // requirements may live in the PAYMENT-REQUIRED header (base64) or the JSON body
    const header = res.headers.get("payment-required") ?? res.headers.get("x-payment-required");
    let scheme: string | undefined;
    if (header) {
      try {
        const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as {
          accepts?: { scheme?: string }[];
        };
        scheme = decoded.accepts?.[0]?.scheme;
      } catch {
        /* header not base64-JSON — still a 402 */
      }
    }
    if (!scheme) {
      try {
        const body = (await res.json()) as { accepts?: { scheme?: string }[] };
        scheme = body.accepts?.[0]?.scheme;
      } catch {
        /* no JSON body */
      }
    }
    return { ok: true, status: 402, scheme };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Register a partner endpoint (probe first — no dead listings). */
export async function registerPartnerEndpoint(input: PartnerInput) {
  const probe = await probeX402(input.endpointUrl);
  if (!probe.ok) {
    throw new Error(`endpoint failed the x402 probe: ${probe.error ?? "no 402"}`);
  }
  const slug = `partner-${input.team.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}-${Date.now().toString(36)}`;
  const resource = await registerResource({
    name: input.name.slice(0, 120),
    description: (input.description ?? `x402 endpoint by ${input.team}`).slice(0, 240),
    unitType: "per_request",
    price: "$0.001", // display hint; the partner's own 402 requirements set the real price at pay time
    path: slug,
    author: input.team,
    contentUrl: input.endpointUrl,
    metadata: {
      partner: true,
      externalUrl: input.endpointUrl,
      team: input.team,
      contact: input.contact ?? null,
      probedScheme: probe.scheme ?? null,
      probedAt: new Date().toISOString(),
    },
  });
  return { resource, probe };
}

export interface PartnerView {
  resourceId: string;
  name: string;
  team: string;
  endpointUrl: string;
  probedScheme: string | null;
  createdAt: Date;
}

export function listPartners(): PartnerView[] {
  return listAllResources()
    .filter((r) => {
      try {
        return Boolean(r.metadata && (JSON.parse(r.metadata) as { partner?: boolean }).partner) && !r.archived;
      } catch {
        return false;
      }
    })
    .map((r) => {
      const m = JSON.parse(r.metadata!) as { externalUrl: string; team: string; probedScheme?: string | null };
      return {
        resourceId: r.id,
        name: r.name,
        team: m.team,
        endpointUrl: m.externalUrl,
        probedScheme: m.probedScheme ?? null,
        createdAt: r.createdAt,
      };
    });
}
