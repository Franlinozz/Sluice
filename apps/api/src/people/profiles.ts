/**
 * Profiles (R5 — CLAUDE.md rule 16: ONE PROFILE = ONE HUMAN). A profile may link several wallets;
 * everywhere we count users, wallets cluster into their profile and count ONCE. Nothing in this
 * module helps a person appear as more than one; referral attribution is recorded once, at
 * creation, and displayed honestly.
 *
 * Trust model (testnet demo): wallet ownership is asserted by the connected session that calls
 * ensure/link. No funds or permissions attach to a profile — it's attribution, not authority.
 */
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { profiles, profileWallets, research, resources, type Profile } from "../db/schema.ts";

const HANDLE_RE = /^[a-z0-9-]{3,24}$/;

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function profileByWallet(wallet: string): Profile | undefined {
  const link = db.select().from(profileWallets).where(eq(profileWallets.wallet, wallet.toLowerCase())).get();
  if (!link) return undefined;
  return db.select().from(profiles).where(eq(profiles.id, link.profileId)).get();
}

export function profileById(id: string): Profile | undefined {
  return db.select().from(profiles).where(eq(profiles.id, id)).get();
}

export function profileByHandle(handle: string): Profile | undefined {
  return db.select().from(profiles).where(eq(profiles.handle, handle.toLowerCase())).get();
}

/** Get-or-create the profile for a wallet. Referral recorded ONCE, at creation only. */
export function ensureProfile(wallet: string, refHandle?: string): Profile {
  const w = wallet.toLowerCase();
  const existing = profileByWallet(w);
  if (existing) return existing;
  let refBy: string | null = null;
  if (refHandle) {
    const ref = profileByHandle(refHandle);
    if (ref) refBy = ref.id; // an unknown handle simply records nothing — no invented referrers
  }
  const id = randomUUID();
  db.insert(profiles).values({ id, displayName: short(w), refBy }).run();
  db.insert(profileWallets).values({ wallet: w, profileId: id }).run();
  return profileById(id)!;
}

/** Link an additional wallet to an existing profile (it now counts as the SAME human). */
export function linkWallet(profileId: string, wallet: string): { ok: boolean; error?: string } {
  const w = wallet.toLowerCase();
  if (!profileById(profileId)) return { ok: false, error: "profile not found" };
  const existing = db.select().from(profileWallets).where(eq(profileWallets.wallet, w)).get();
  if (existing) {
    if (existing.profileId === profileId) return { ok: true };
    return { ok: false, error: "wallet already belongs to another profile" };
  }
  db.insert(profileWallets).values({ wallet: w, profileId }).run();
  return { ok: true };
}

export function updateProfile(
  id: string,
  patch: { displayName?: string; handle?: string | null; isPublic?: boolean; avatarUrl?: string | null },
): { ok: boolean; error?: string; profile?: Profile } {
  const p = profileById(id);
  if (!p) return { ok: false, error: "profile not found" };
  const set: Record<string, unknown> = {};
  if (patch.displayName !== undefined) {
    const dn = patch.displayName.trim().slice(0, 40);
    if (dn.length < 2) return { ok: false, error: "display name too short" };
    set.displayName = dn;
  }
  if (patch.handle !== undefined) {
    if (patch.handle === null || patch.handle === "") set.handle = null;
    else {
      const h = patch.handle.trim().toLowerCase();
      if (!HANDLE_RE.test(h)) return { ok: false, error: "handle must be 3-24 chars, a-z 0-9 -" };
      const taken = profileByHandle(h);
      if (taken && taken.id !== id) return { ok: false, error: "handle already taken" };
      set.handle = h;
    }
  }
  if (patch.isPublic !== undefined) set.isPublic = Boolean(patch.isPublic);
  if (patch.avatarUrl !== undefined) set.avatarUrl = patch.avatarUrl?.slice(0, 300) ?? null;
  if (Object.keys(set).length > 0) db.update(profiles).set(set).where(eq(profiles.id, id)).run();
  return { ok: true, profile: profileById(id) };
}

export function walletsOf(profileId: string): string[] {
  return db
    .select()
    .from(profileWallets)
    .where(eq(profileWallets.profileId, profileId))
    .all()
    .map((w) => w.wallet);
}

export interface PublicProfileView {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: Date;
  invitedBy: string | null; // handle or name of the referrer (if that referrer is public)
  questionsAsked: number;
  resourcesRegistered: number;
}

/** Public, opt-in community list. Counts are real per-profile action counts. */
export function communityProfiles(): PublicProfileView[] {
  const pubs = db.select().from(profiles).where(eq(profiles.isPublic, true)).orderBy(desc(profiles.joinedAt)).all();
  return pubs.map((p) => {
    const asked = db.select().from(research).where(eq(research.profileId, p.id)).all().length;
    const regs = db.select().from(resources).where(eq(resources.profileId, p.id)).all().length;
    let invitedBy: string | null = null;
    if (p.refBy) {
      const ref = profileById(p.refBy);
      if (ref?.isPublic) invitedBy = ref.handle ?? ref.displayName;
    }
    return {
      id: p.id,
      handle: p.handle,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      joinedAt: p.joinedAt,
      invitedBy,
      questionsAsked: asked,
      resourcesRegistered: regs,
    };
  });
}

/** Total distinct humans = profiles (each may hold many wallets — still one human). */
export function profileCount(): number {
  return db.select().from(profiles).all().length;
}

/** wallet(lowercase) → profileId map, for clustering wallet-level metrics into humans. */
export function walletClusters(): Map<string, string> {
  return new Map(db.select().from(profileWallets).all().map((w) => [w.wallet, w.profileId]));
}
