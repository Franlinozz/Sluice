/**
 * RSS/Atom connector — ingests a feed (RSSHub route or native) and registers each item as a
 * per_citation citable resource. One RoyaltySplitter per feed (if collaborators), reused by items.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import { db } from "../db/client.ts";
import { feeds, resources } from "../db/schema.ts";
import { registerResource } from "../registry.ts";
import { deploySplitter, type SplitShare } from "../contracts/splitter.ts";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true });

export interface FeedItem {
  title: string;
  link: string;
  author?: string;
  summary?: string;
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)["#text"]);
  }
  return String(v);
}

function atomLink(link: unknown): string {
  if (typeof link === "string") return link;
  const arr = Array.isArray(link) ? link : [link];
  const alt = arr.find((l) => (l as Record<string, unknown>)?.["@_rel"] === "alternate");
  const pick = (alt ?? arr[0]) as Record<string, unknown> | undefined;
  return pick ? String(pick["@_href"] ?? "") : "";
}

export async function fetchFeed(feedUrl: string): Promise<{ title: string; items: FeedItem[] }> {
  const res = await fetch(feedUrl, {
    headers: { "user-agent": "Sluice/1.0 (+https://sluice-six.vercel.app)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`feed fetch failed: ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml) as Record<string, any>;

  if (doc.rss?.channel) {
    const ch = doc.rss.channel;
    const raw = Array.isArray(ch.item) ? ch.item : ch.item ? [ch.item] : [];
    return {
      title: text(ch.title) || feedUrl,
      items: raw
        .map((it: any) => ({
          title: text(it.title),
          link: text(it.link) || text(it.guid),
          author: text(it["dc:creator"] ?? it.author) || undefined,
          summary: text(it.description ?? it["content:encoded"]).slice(0, 280) || undefined,
        }))
        .filter((i: FeedItem) => i.title && i.link),
    };
  }
  if (doc.feed) {
    const f = doc.feed;
    const raw = Array.isArray(f.entry) ? f.entry : f.entry ? [f.entry] : [];
    return {
      title: text(f.title) || feedUrl,
      items: raw
        .map((e: any) => ({
          title: text(e.title),
          link: atomLink(e.link) || text(e.id),
          author: text(e.author?.name ?? e.author) || undefined,
          summary: text(e.summary ?? e.content).slice(0, 280) || undefined,
        }))
        .filter((i: FeedItem) => i.title && i.link),
    };
  }
  throw new Error("unrecognized feed format (not RSS or Atom)");
}

function getResourceByContentUrl(url: string) {
  return db.select().from(resources).where(eq(resources.contentUrl, url)).get();
}

export interface IngestInput {
  feedUrl: string;
  price: string; // human, e.g. "$0.000001"
  unitType?: "per_citation" | "per_read" | "per_crawl" | "per_request";
  limit?: number;
  author?: string;
  /** Optional collaborators → one splitter for the whole feed. */
  splits?: SplitShare[];
}

export async function ingestFeed(input: IngestInput) {
  const { title, items } = await fetchFeed(input.feedUrl);
  const limit = Math.min(input.limit ?? 8, items.length);

  // upsert feed
  let feed = db.select().from(feeds).where(eq(feeds.feedUrl, input.feedUrl)).get();
  if (!feed) {
    const id = randomUUID();
    db.insert(feeds).values({ id, feedUrl: input.feedUrl, title, itemCount: 0 }).run();
    feed = db.select().from(feeds).where(eq(feeds.id, id)).get()!;
  }

  // one splitter per feed (if collaborators)
  let splitterAddress: string | undefined;
  const splits = input.splits && input.splits.length >= 2 ? input.splits : undefined;
  if (splits) splitterAddress = await deploySplitter(splits);

  const unitType = input.unitType ?? "per_citation";
  let registered = 0;
  let skipped = 0;
  const out: { name: string; path: string; contentUrl: string }[] = [];

  for (const item of items.slice(0, limit)) {
    if (getResourceByContentUrl(item.link)) {
      skipped++;
      continue;
    }
    try {
      const r = await registerResource({
        name: item.title.slice(0, 120),
        description: item.summary,
        unitType: unitType as never,
        price: input.price,
        path: `${feed.id.slice(0, 6)}-${randomUUID().slice(0, 8)}`,
        author: item.author ?? input.author ?? title,
        contentUrl: item.link,
        sourceType: "feed_item",
        splits,
        splitterAddress,
        feedId: feed.id,
      });
      registered++;
      out.push({ name: r.name, path: r.path, contentUrl: r.contentUrl! });
    } catch {
      skipped++;
    }
  }

  db.update(feeds)
    .set({ itemCount: (feed.itemCount ?? 0) + registered })
    .where(eq(feeds.id, feed.id))
    .run();

  return { feed: { id: feed.id, title, feedUrl: input.feedUrl }, registered, skipped, splitterAddress, resources: out };
}

export function listFeeds() {
  return db.select().from(feeds).all();
}
