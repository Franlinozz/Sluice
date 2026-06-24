/**
 * Streaming (per-second) meter with proof-of-flow (Phase 4). The payer approves a RATE + a RESERVE
 * cap; the meter accrues per second only while a heartbeat confirms delivery. Heartbeat loss
 * auto-pauses (no charge for dead air); heartbeat return auto-resumes; manual pause/resume/stop too.
 * At stop, the flowed whole seconds settle via the existing Gateway per_second toll (real receipt).
 * Unused reserve is simply never charged (honest — nothing was escrowed to refund).
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { toBaseUnitString } from "@sluice/money";
import { db } from "../db/client.ts";
import { resources, sessions, type Session } from "../db/schema.ts";
import { getResource } from "../registry.ts";
import { payResource } from "../agent/pay.ts";

export const HEARTBEAT_TIMEOUT_MS = Number(process.env.STREAM_HEARTBEAT_TIMEOUT_MS ?? "4000");

function now(): number {
  return Date.now();
}

function get(id: string): Session | undefined {
  return db.select().from(sessions).where(eq(sessions.id, id)).get();
}

function reserveMs(s: Session): number {
  const rate = BigInt(s.rate);
  if (rate === 0n) return 0;
  const seconds = BigInt(s.reserve) / rate; // whole seconds covered by the reserve
  return Number(seconds) * 1000;
}

/** Live, computed view of a session (server is the source of truth). */
export function sessionState(s: Session) {
  const rate = BigInt(s.rate);
  const cap = reserveMs(s);
  let flowedMs = s.accruedMs;
  if (s.status === "flowing") flowedMs += now() - s.lastTickAt;
  if (flowedMs > cap) flowedMs = cap;
  const accrued = (rate * BigInt(Math.floor(flowedMs))) / 1000n;
  const reserveRemaining = BigInt(s.reserve) - accrued;
  const heartbeatFresh = now() - s.heartbeatAt <= HEARTBEAT_TIMEOUT_MS;
  return {
    id: s.id,
    resourceId: s.resourceId,
    payer: s.payer,
    rate: s.rate,
    reserve: s.reserve,
    status: s.status,
    flowPaused: s.flowPaused,
    flowedSeconds: Math.floor(flowedMs / 1000),
    flowedMs: Math.floor(flowedMs),
    accrued: toBaseUnitString(accrued),
    reserveRemaining: toBaseUnitString(reserveRemaining < 0n ? 0n : reserveRemaining),
    capped: flowedMs >= cap,
    heartbeatFresh,
    settledSeconds: s.settledSeconds,
    settledAmount: s.settledAmount,
    receiptId: s.receiptId,
    startedAt: s.startedAt,
    stoppedAt: s.stoppedAt,
  };
}

/**
 * Freeze the flowing delta into accruedMs up to `atMs` (capped at the reserve). For heartbeat-loss
 * auto-pause we freeze at the LAST heartbeat — so dead air after it is never charged (honest).
 */
function freezeAt(s: Session, atMs: number): Session {
  if (s.status !== "flowing") return s;
  const cap = reserveMs(s);
  let acc = s.accruedMs + Math.max(0, atMs - s.lastTickAt);
  if (acc > cap) acc = cap;
  db.update(sessions).set({ accruedMs: acc, lastTickAt: atMs }).where(eq(sessions.id, s.id)).run();
  return get(s.id)!;
}
function freeze(s: Session): Session {
  return freezeAt(s, now());
}

export interface CreateSessionInput {
  resourceId: string;
  payer: string;
  /** Reserve cap in whole seconds (default 600). */
  reserveSeconds?: number;
}

export function createSession(input: CreateSessionInput): Session {
  const resource = getResource(input.resourceId);
  if (!resource) throw new Error("resource not found");
  if (resource.unitType !== "per_second") throw new Error("resource is not per_second (streaming)");
  const rate = resource.unitPrice; // payer approves the resource's per-second rate
  const seconds = Math.max(1, Math.floor(input.reserveSeconds ?? 600));
  const reserve = toBaseUnitString(BigInt(rate) * BigInt(seconds));
  const id = randomUUID();
  const t = now();
  db.insert(sessions)
    .values({
      id,
      resourceId: input.resourceId,
      payer: input.payer,
      rate,
      reserve,
      accruedMs: 0,
      status: "flowing",
      flowPaused: false,
      lastTickAt: t,
      heartbeatAt: t,
    })
    .run();
  return get(id)!;
}

export function heartbeat(id: string): Session | undefined {
  const s = get(id);
  if (!s || s.status === "stopped") return s;
  if (s.status === "paused" && s.flowPaused) {
    // flow returned → auto-resume
    db.update(sessions)
      .set({ status: "flowing", flowPaused: false, lastTickAt: now(), heartbeatAt: now() })
      .where(eq(sessions.id, id))
      .run();
    return get(id);
  }
  db.update(sessions).set({ heartbeatAt: now() }).where(eq(sessions.id, id)).run();
  return get(id);
}

export function pauseSession(id: string): Session | undefined {
  const s = get(id);
  if (!s || s.status !== "flowing") return s;
  freeze(s);
  db.update(sessions).set({ status: "paused", flowPaused: false }).where(eq(sessions.id, id)).run();
  return get(id);
}

export function resumeSession(id: string): Session | undefined {
  const s = get(id);
  if (!s || s.status !== "paused") return s;
  db.update(sessions)
    .set({ status: "flowing", flowPaused: false, lastTickAt: now(), heartbeatAt: now() })
    .where(eq(sessions.id, id))
    .run();
  return get(id);
}

/** Watcher tick: auto-pause flowing sessions whose heartbeat has gone stale (proof-of-flow loss). */
export function reapStaleSessions(): number {
  const flowing = db.select().from(sessions).where(eq(sessions.status, "flowing")).all();
  let paused = 0;
  for (const s of flowing) {
    const age = now() - s.heartbeatAt;
    if (age > HEARTBEAT_TIMEOUT_MS) {
      // Freeze at the last heartbeat — no charge for dead air after flow stopped.
      freezeAt(s, s.heartbeatAt);
      db.update(sessions).set({ status: "paused", flowPaused: true }).where(eq(sessions.id, s.id)).run();
      paused++;
    }
  }
  return paused;
}

export interface StopResult {
  session: ReturnType<typeof sessionState>;
  settledSeconds: number;
  settledAmount: string;
  paid: boolean;
  error?: string;
}

export async function stopSession(id: string): Promise<StopResult> {
  let s = get(id);
  if (!s) throw new Error("session not found");
  if (s.status === "flowing") s = freeze(s);

  const flowedSeconds = Math.min(Math.floor(s.accruedMs / 1000), Number(reserveMs(s) / 1000));
  const resource = db.select().from(resources).where(eq(resources.id, s.resourceId)).get();
  let paid = false;
  let error: string | undefined;
  const settledAmount = toBaseUnitString(BigInt(s.rate) * BigInt(flowedSeconds));

  if (flowedSeconds > 0 && resource) {
    // Settle the flowed whole seconds via the existing Gateway per_second toll (real settlement).
    const res = await payResource(`${resource.path}?units=${flowedSeconds}`);
    if (res.ok) paid = true;
    else error = res.error;
  }

  db.update(sessions)
    .set({
      status: "stopped",
      stoppedAt: new Date(),
      settledSeconds: flowedSeconds,
      settledAmount,
    })
    .where(eq(sessions.id, id))
    .run();

  return { session: sessionState(get(id)!), settledSeconds: flowedSeconds, settledAmount, paid, error };
}

export function getSessionState(id: string) {
  const s = get(id);
  return s ? sessionState(s) : undefined;
}
