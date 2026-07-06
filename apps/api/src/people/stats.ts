/**
 * The honest scoreboard (R5 /traction + GET /stats). Every number is computed from receipts,
 * accruals, and profiles — conservatively (rule 16):
 * - distinctHumans = profiles (one per human, however many wallets they link).
 * - distinctPayingWallets = distinct payer wallets, CLUSTERED: wallets linked to the same profile
 *   count once. Unlinked wallets count individually (they may still be the same person — so this
 *   number is an UPPER bound on wallets, not on humans; the honest human count is profiles).
 * - creatorsEarning = distinct payTo addresses with settled receipts, clustered the same way.
 * Everything is clickable through to receipts/Arcscan on the traction page.
 */
import { desc } from "drizzle-orm";
import { formatUSD } from "@sluice/money";
import { db } from "../db/client.ts";
import { receipts, resources } from "../db/schema.ts";
import { profileCount, walletClusters } from "./profiles.ts";

export interface StatsView {
  generatedAt: string;
  distinctHumans: number;
  distinctPayingWallets: number;
  creatorsEarning: number;
  settlements: number;
  totalSettled: string;
  formattedTotalSettled: string;
  settlementsByDay: { day: string; count: number; amount: string }[];
  latestReceipts: {
    id: string;
    resourceName: string | null;
    formattedAmount: string;
    unitType: string;
    settledAt: string | null;
  }[];
  notes: string[];
}

export function computeStats(): StatsView {
  const all = db.select().from(receipts).orderBy(desc(receipts.createdAt)).all();
  const settled = all.filter((r) => r.status === "settled");
  const clusters = walletClusters();
  const clusterOf = (wallet: string) => clusters.get(wallet.toLowerCase()) ?? wallet.toLowerCase();

  const payingClusters = new Set(settled.map((r) => clusterOf(r.payer)));
  const resById = new Map(db.select().from(resources).all().map((r) => [r.id, r] as const));
  const creatorClusters = new Set(
    settled.map((r) => resById.get(r.resourceId)?.payTo).filter(Boolean).map((w) => clusterOf(w!)),
  );

  const total = settled.reduce((a, r) => a + BigInt(r.grossAmount), 0n);

  const byDay = new Map<string, { count: number; amount: bigint }>();
  for (const r of settled) {
    const d = new Date(r.settledAt ?? r.createdAt).toISOString().slice(0, 10);
    const e = byDay.get(d) ?? { count: 0, amount: 0n };
    e.count += 1;
    e.amount += BigInt(r.grossAmount);
    byDay.set(d, e);
  }

  return {
    generatedAt: new Date().toISOString(),
    distinctHumans: profileCount(),
    distinctPayingWallets: payingClusters.size,
    creatorsEarning: creatorClusters.size,
    settlements: settled.length,
    totalSettled: total.toString(),
    formattedTotalSettled: formatUSD(total),
    settlementsByDay: Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, v]) => ({ day, count: v.count, amount: v.amount.toString() })),
    latestReceipts: all.slice(0, 8).map((r) => ({
      id: r.id,
      resourceName: resById.get(r.resourceId)?.name ?? null,
      formattedAmount: formatUSD(BigInt(r.grossAmount)),
      unitType: r.unitType,
      settledAt: r.settledAt ? new Date(r.settledAt).toISOString() : null,
    })),
    notes: [
      "distinctHumans counts profiles; linked wallets collapse into one human (never inflated).",
      "distinctPayingWallets clusters linked wallets; unlinked wallets may still be one person.",
      "Every figure derives from settled receipts you can open in /app/settlements or on Arcscan.",
    ],
  };
}
