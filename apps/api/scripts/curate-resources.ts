/**
 * Curation pass (CLAUDE.md Overhaul rule 15) — CURATION IS NOT FAKING.
 * Archives junk/duplicate TEST resources so Bazaar/Streams/Studio read intentionally; renames the
 * two kept per-second demo streams to clear names. RECEIPTS ARE NEVER TOUCHED — settlement history
 * is immutable and archived resources keep resolving by id (Settlements shows their names).
 * Idempotent: safe to re-run.
 *
 *   pnpm --filter @sluice/api exec tsx scripts/curate-resources.ts
 */
import "../src/env.ts";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client.ts";
import { resources } from "../src/db/schema.ts";

const ARCHIVE_NAME_PATTERNS: RegExp[] = [
  /^stream debug$/i,
  /archon robotics/i, // random keyword-feed results, not our story
  /archon soul/i,
  /plant watering build/i,
  /archon sprout/i,
  /archon delegation/i,
  /cve-\d{4}-\d+/i,
  /is hiring/i, // job-post feed noise
];

function main() {
  const all = db.select().from(resources).all();
  let archived = 0;
  let renamed = 0;

  // 1) Name-pattern junk → archive.
  for (const r of all) {
    if (r.archived) continue;
    if (ARCHIVE_NAME_PATTERNS.some((p) => p.test(r.name))) {
      db.update(resources).set({ archived: true }).where(eq(resources.id, r.id)).run();
      console.log(`  archived  ${r.unitType.padEnd(13)} ${r.name.slice(0, 60)}`);
      archived++;
    }
  }

  // 2) PeerTube test imports → archive all (the connector stays live; these were crawl tests).
  for (const r of all) {
    if (r.archived) continue;
    if (r.path.startsWith("peertube-")) {
      db.update(resources).set({ archived: true }).where(eq(resources.id, r.id)).run();
      console.log(`  archived  ${r.unitType.padEnd(13)} ${r.name.slice(0, 60)} (peertube test)`);
      archived++;
    }
  }

  // 3) "Live Compute Stream" duplicates → keep the two OLDEST (they hold the demo receipts),
  //    rename them clearly, archive the rest.
  const computeStreams = db
    .select()
    .from(resources)
    .all()
    .filter((r) => /^live (compute|research) stream/i.test(r.name) && !r.archived)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const KEEP_NAMES = ["Live Compute Stream — demo", "Live Research Stream — demo"];
  computeStreams.forEach((r, i) => {
    if (i < 2) {
      if (r.name !== KEEP_NAMES[i]) {
        db.update(resources).set({ name: KEEP_NAMES[i]! }).where(eq(resources.id, r.id)).run();
        console.log(`  renamed   ${r.name.slice(0, 40)} → ${KEEP_NAMES[i]}`);
        renamed++;
      }
    } else {
      db.update(resources).set({ archived: true }).where(eq(resources.id, r.id)).run();
      console.log(`  archived  per_second    ${r.name.slice(0, 60)} (duplicate)`);
      archived++;
    }
  });

  const active = db.select().from(resources).all().filter((r) => !r.archived);
  console.log(`\n${archived} archived, ${renamed} renamed · ${active.length} active resources remain:`);
  for (const r of active) console.log(`  · ${r.unitType.padEnd(13)} ${r.name.slice(0, 60)}`);
}

main();
