/**
 * PeerTube connector (LIVE) — ingests real videos from any public PeerTube instance and registers
 * each as a per_second streaming resource, reusing the Meter + streaming engine. PeerTube's REST API
 * is unauthenticated for public videos, so this is genuinely live (no keys required).
 */
import { registerResource } from "../registry.ts";

const DEFAULT_INSTANCE = process.env.PEERTUBE_INSTANCE ?? "https://framatube.org";
const DEFAULT_PRICE_PER_SECOND = process.env.PEERTUBE_PRICE ?? "0.0001"; // $0.0001/sec

interface PeerTubeVideo {
  uuid: string;
  shortUUID?: string;
  name: string;
  duration: number;
  url?: string;
  channel?: { displayName?: string; name?: string };
  account?: { displayName?: string };
}

export interface PeerTubeIngestResult {
  instance: string;
  ingested: number;
  skipped: number;
  resources: { id: string; name: string }[];
}

export async function ingestPeerTube(opts?: {
  instance?: string;
  count?: number;
  pricePerSecond?: string;
}): Promise<PeerTubeIngestResult> {
  const instance = (opts?.instance ?? DEFAULT_INSTANCE).replace(/\/$/, "");
  const count = Math.min(Math.max(opts?.count ?? 6, 1), 25);
  const price = opts?.pricePerSecond ?? DEFAULT_PRICE_PER_SECOND;

  const res = await fetch(`${instance}/api/v1/videos?count=${count}&sort=-publishedAt&isLive=false&nsfw=false`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`PeerTube API ${res.status} for ${instance}`);
  const data = (await res.json()) as { data: PeerTubeVideo[] };

  const out: PeerTubeIngestResult = { instance, ingested: 0, skipped: 0, resources: [] };
  for (const v of data.data ?? []) {
    const slug = `peertube-${(v.shortUUID ?? v.uuid).slice(0, 12).toLowerCase()}`;
    const author = v.channel?.displayName ?? v.account?.displayName ?? v.channel?.name ?? "PeerTube";
    try {
      const r = await registerResource({
        name: v.name.slice(0, 120),
        unitType: "per_second",
        price,
        path: slug,
        description: `PeerTube video · ${Math.round(v.duration)}s · ${author}`,
        author,
        contentUrl: v.url ?? `${instance}/w/${v.shortUUID ?? v.uuid}`,
        sourceType: "url",
        metadata: { connector: "peertube", instance, durationSec: v.duration, uuid: v.uuid },
      });
      out.ingested += 1;
      out.resources.push({ id: r.id, name: r.name });
    } catch {
      out.skipped += 1; // duplicate path / already ingested
    }
  }
  return out;
}
