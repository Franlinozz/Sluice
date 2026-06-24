import { apiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy to the Sluice API (VPS, http) for CLIENT-side calls (e.g. the Live Meter's
 * polling + heartbeats). Keeps the browser on https — the Next server does the http hop.
 */
async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const search = new URL(req.url).search;
  const target = `${apiBase}/${path.join("/")}${search}`;
  const init: RequestInit = { method: req.method, headers: { "content-type": "application/json" } };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.text();
    if (body) init.body = body;
  }
  try {
    const r = await fetch(target, { ...init, cache: "no-store" });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "proxy error" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}

export const GET = proxy;
export const POST = proxy;
