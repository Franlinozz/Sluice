import { NextResponse } from "next/server";

/**
 * GET /api/stats (R5): the honest scoreboard, machine-readable — for the submission form and for
 * judges' scripts. Same source as /traction (the registry's /stats), so the numbers always match.
 */
export const dynamic = "force-dynamic";

const BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET() {
  try {
    const res = await fetch(`${BASE}/stats`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "stats unavailable" }, { status: 502 });
    return NextResponse.json(await res.json(), {
      headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
    });
  } catch {
    return NextResponse.json({ error: "stats unavailable" }, { status: 502 });
  }
}
