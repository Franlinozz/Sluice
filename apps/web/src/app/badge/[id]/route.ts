import { apiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Proxy the API's SVG badge so it embeds over https (avoids mixed content on deployed pages). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const r = await fetch(`${apiBase}/badge/${id}`, { cache: "no-store" });
    const svg = await r.text();
    return new Response(svg, {
      status: r.ok ? 200 : 404,
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="268" height="46"/>', {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
