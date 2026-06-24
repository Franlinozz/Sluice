/**
 * Unit adapters — each knows how to count its unit from an event. Unit-agnostic by design:
 * the accrual engine never special-cases a unit type (CLAUDE.md: the Meter is the primitive).
 */
import type { UnitType } from "../db/schema.ts";

export interface UnitEvent {
  requests?: number;
  bytes?: number;
  seconds?: number;
  tokens?: number;
  citations?: number;
  listens?: number;
  views?: number;
}

export function countUnits(unitType: UnitType, event: UnitEvent = {}): number {
  const n = (v: number | undefined, fallback = 0) =>
    Math.max(0, Math.floor(Number.isFinite(v) ? (v as number) : fallback));
  switch (unitType) {
    case "per_request":
      return n(event.requests, 1) || 1;
    case "per_byte":
      return n(event.bytes);
    case "per_second":
      return n(event.seconds);
    case "per_token":
      return n(event.tokens);
    case "per_citation":
      return n(event.citations, 1) || 1;
    case "per_listen":
      return n(event.listens, 1) || 1;
    case "per_view":
      return n(event.views, 1) || 1;
    default:
      return 1;
  }
}

export const UNIT_LABEL: Record<UnitType, string> = {
  per_request: "request",
  per_byte: "byte",
  per_second: "second",
  per_token: "token",
  per_citation: "citation",
  per_listen: "listen",
  per_view: "view",
};

/** Human "per X" label. */
export function unitRateLabel(unitType: UnitType): string {
  return `per ${UNIT_LABEL[unitType]}`;
}
