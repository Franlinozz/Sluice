/**
 * OSS media connectors. Navidrome (per_listen music royalties) and Owncast (per_second live
 * streaming) reuse the Meter + streaming engine. These adapters are REAL — they work against a real
 * instance — but ship labeled "available" because they require you to point them at your own server
 * (Navidrome needs credentials; Owncast needs your instance URL). We don't fake a running instance.
 */
import { registerResource } from "../registry.ts";

// ── Navidrome (per_listen) ───────────────────────────────────────
export interface NavidromeOpts {
  baseUrl: string;
  user: string;
  token: string; // Subsonic auth token (md5(password+salt))
  salt: string;
  count?: number;
  pricePerListen?: string;
}

/** Ingest songs from a Navidrome (Subsonic API) server as per_listen resources. */
export async function ingestNavidrome(opts: NavidromeOpts): Promise<{ ingested: number; skipped: number }> {
  const base = opts.baseUrl.replace(/\/$/, "");
  const auth = `u=${encodeURIComponent(opts.user)}&t=${opts.token}&s=${opts.salt}&v=1.16.1&c=sluice&f=json`;
  const res = await fetch(`${base}/rest/getRandomSongs.view?${auth}&size=${opts.count ?? 10}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Navidrome ${res.status}`);
  const json = (await res.json()) as {
    ["subsonic-response"]?: { randomSongs?: { song?: { id: string; title: string; artist?: string }[] } };
  };
  const songs = json["subsonic-response"]?.randomSongs?.song ?? [];
  let ingested = 0;
  let skipped = 0;
  for (const s of songs) {
    try {
      await registerResource({
        name: s.title.slice(0, 120),
        unitType: "per_listen",
        price: opts.pricePerListen ?? "0.002",
        path: `navidrome-${s.id}`.toLowerCase(),
        description: `Track · ${s.artist ?? "Unknown artist"}`,
        author: s.artist,
        contentUrl: `${base}/rest/stream.view?id=${s.id}`,
        sourceType: "url",
        metadata: { connector: "navidrome", songId: s.id },
      });
      ingested += 1;
    } catch {
      skipped += 1;
    }
  }
  return { ingested, skipped };
}

// ── Owncast (per_second live) ────────────────────────────────────
/** Register an Owncast live stream as a per_second streaming resource (uses its public status API). */
export async function ingestOwncast(opts: { instance: string; pricePerSecond?: string }) {
  const base = opts.instance.replace(/\/$/, "");
  const res = await fetch(`${base}/api/status`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Owncast ${res.status}`);
  const status = (await res.json()) as { online?: boolean; streamTitle?: string; serverName?: string };
  const name = status.streamTitle || status.serverName || "Owncast live stream";
  const r = await registerResource({
    name: name.slice(0, 120),
    unitType: "per_second",
    price: opts.pricePerSecond ?? "0.0002",
    path: `owncast-${base.replace(/^https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}`.toLowerCase().slice(0, 60),
    description: `Owncast live stream · ${status.online ? "online" : "offline"}`,
    contentUrl: base,
    sourceType: "url",
    metadata: { connector: "owncast", instance: base, online: Boolean(status.online) },
  });
  return { resourceId: r.id, online: Boolean(status.online) };
}

// ── status surface ───────────────────────────────────────────────
export type ConnectorStatus = "live" | "available";
export interface ConnectorInfo {
  id: string;
  name: string;
  unit: string;
  status: ConnectorStatus;
  description: string;
}

export function connectorCatalog(): ConnectorInfo[] {
  return [
    {
      id: "rss",
      name: "RSS / RSSHub",
      unit: "per_citation",
      status: "live",
      description: "Ingest any RSS/Atom feed or RSSHub route; items become citable resources.",
    },
    {
      id: "peertube",
      name: "PeerTube",
      unit: "per_second",
      status: "live",
      description: "Ingest real videos from any public PeerTube instance as per-second streams.",
    },
    {
      id: "navidrome",
      name: "Navidrome",
      unit: "per_listen",
      status: "available",
      description: "Per-listen music royalties from a Navidrome (Subsonic) server — point it at your instance.",
    },
    {
      id: "owncast",
      name: "Owncast",
      unit: "per_second",
      status: "available",
      description: "Per-second live streaming from an Owncast instance — point it at your stream.",
    },
  ];
}
