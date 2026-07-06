"use client";

import * as React from "react";
import type { ReceiptDTO } from "@/lib/api";

interface ResourceLite {
  id: string;
  name: string;
  payTo: string;
}

interface Edge {
  payer: string;
  creator: string; // payTo
  creatorLabel: string;
  amount: number; // usd, aggregated
  count: number;
}

interface Pulse {
  edge: number;
  t: number;
  speed: number;
  /** true = fired by a NEW real settlement observed live; false = ambient replay of history */
  real: boolean;
}

function short(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 5)}…${addr.slice(-3)}` : addr;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const WINDOW_MS = 7 * 24 * 3600 * 1000;

/**
 * "Watch the economy" v2 (R3): agents (left) paying creators (right), built from REAL settled
 * receipts aggregated over the last 7 days (falls back to all-time so it never renders empty).
 * The component polls the registry and fires a bright pulse on the exact edge of each NEW real
 * settlement as it lands; when things are quiet it honestly replays recent history at low glow
 * ("quiet right now"). Canvas 2D, sprites, theme-aware, paused off-screen. Reduced-motion: static
 * graph with labels.
 */
export function EconomyViz({
  receipts,
  resources,
  className,
}: {
  receipts: ReceiptDTO[];
  resources: ResourceLite[];
  className?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = React.useState<{ mode: "live" | "replay" | "empty"; text: string }>({
    mode: "replay",
    text: "quiet right now — replaying recent settlements",
  });

  const build = React.useCallback((rc: ReceiptDTO[], rs: ResourceLite[]) => {
    const byId = new Map(rs.map((r) => [r.id, r] as const));
    const settled = rc.filter((r) => r.status === "settled");
    const cutoff = Date.now() - WINDOW_MS;
    let windowed = settled.filter((r) => new Date(r.settledAt ?? r.createdAt).getTime() >= cutoff);
    let windowLabel = "last 7 days";
    if (new Set(windowed.map((r) => `${r.payer}->${byId.get(r.resourceId)?.payTo}`)).size < 4) {
      windowed = settled; // never render an empty economy — widen honestly and say so
      windowLabel = "all time";
    }
    const map = new Map<string, Edge>();
    for (const r of windowed) {
      const res = byId.get(r.resourceId);
      if (!res) continue;
      const key = `${r.payer}->${res.payTo}`;
      const amount = Number(r.grossAmount) / 1e6;
      const e = map.get(key);
      if (e) {
        e.amount += amount;
        e.count += 1;
      } else {
        map.set(key, {
          payer: r.payer,
          creator: res.payTo,
          creatorLabel: (r.resourceName ?? res.name).slice(0, 26),
          amount,
          count: 1,
        });
      }
    }
    return { edges: Array.from(map.values()).slice(0, 22), windowLabel };
  }, []);

  const initial = React.useMemo(() => build(receipts, resources), [build, receipts, resources]);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx0 = canvas.getContext("2d");
    if (!ctx0) return;
    const ctx = ctx0; // narrowed capture — safe inside nested closures

    let edges = initial.edges;
    let windowLabel = initial.windowLabel;
    if (edges.length === 0) {
      setStatus({ mode: "empty", text: "no settlements yet — the economy starts with the first payment" });
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pal = {
      steel: cssVar("--steel", "#9da7b3"),
      flow: cssVar("--flow", "#6FE3F0"),
      settled: cssVar("--settled", "#57c98a"),
      mid: cssVar("--text-mid", "#a7abb2"),
      low: cssVar("--text-low", "#6a6e76"),
      dark: (document.documentElement.getAttribute("data-theme") ?? "dark") !== "light",
    };
    const themeObs = new MutationObserver(() => {
      pal = { ...pal,
        steel: cssVar("--steel", "#9da7b3"),
        flow: cssVar("--flow", "#6FE3F0"),
        settled: cssVar("--settled", "#57c98a"),
        mid: cssVar("--text-mid", "#a7abb2"),
        low: cssVar("--text-low", "#6a6e76"),
        dark: (document.documentElement.getAttribute("data-theme") ?? "dark") !== "light",
      };
      draw(0);
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let W = 0, H = 0;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      W = r.width;
      H = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw(0);
    });
    ro.observe(wrap);

    const payers = () => Array.from(new Set(edges.map((e) => e.payer)));
    const creators = () => Array.from(new Set(edges.map((e) => e.creator)));
    const labelOf = () => new Map(edges.map((e) => [e.creator, e.creatorLabel] as const));
    const px = () => W * 0.17;
    const cx = () => W * 0.83;
    const nodeY = (i: number, n: number) => H * 0.12 + ((H * 0.78) * (i + 0.5)) / Math.max(1, n);

    const pulses: Pulse[] = [];
    const flashes: { creator: string; t0: number; real: boolean }[] = [];

    const posPayer = (p: string) => ({ x: px(), y: nodeY(payers().indexOf(p), payers().length) });
    const posCreator = (c: string) => ({ x: cx(), y: nodeY(creators().indexOf(c), creators().length) });

    function bez(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
      const mx = (a.x + b.x) / 2;
      const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
      const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * ((a.y + b.y) / 2) + t * t * b.y;
      return { x, y };
    }

    function draw(now: number) {
      ctx.clearRect(0, 0, W, H);
      const ps = payers();
      const cs = creators();
      const lo = labelOf();

      // column headers
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillStyle = pal.low;
      ctx.textAlign = "left";
      ctx.fillText("CREATORS · earning", cx() + 12, H * 0.08);
      ctx.textAlign = "right";
      ctx.fillText("AGENTS · paying", px() - 12, H * 0.08);

      // edges — width scales gently with settled volume
      for (const e of edges) {
        const a = posPayer(e.payer);
        const b = posCreator(e.creator);
        ctx.globalAlpha = pal.dark ? 0.15 : 0.22;
        ctx.strokeStyle = pal.steel;
        ctx.lineWidth = Math.min(2.4, 0.7 + Math.log10(1 + e.count) * 1.1);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // nodes
      ctx.font = "11px ui-monospace, monospace";
      for (const p of ps) {
        const { x, y } = posPayer(p);
        ctx.fillStyle = pal.mid;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.textAlign = "right";
        ctx.fillStyle = pal.mid;
        ctx.fillText(short(p), x - 10, y + 3);
      }
      for (const c of cs) {
        const { x, y } = posCreator(c);
        // settled flash ring on real arrival
        const f = flashes.find((f) => f.creator === c && now - f.t0 < 900);
        if (f) {
          const k = 1 - (now - f.t0) / 900;
          ctx.globalAlpha = k * (f.real ? 0.9 : 0.4);
          ctx.strokeStyle = pal.settled;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 5 + (1 - k) * 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = pal.steel;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.textAlign = "left";
        ctx.fillStyle = pal.mid;
        // truncate to the space actually available inside the canvas
        let label = lo.get(c) ?? short(c);
        const maxW = W - x - 16;
        while (label.length > 4 && ctx.measureText(label).width > maxW) label = `${label.slice(0, -2)}…`;
        ctx.fillText(label, x + 10, y + 3);
      }

      // pulses
      for (const pu of pulses) {
        const e = edges[pu.edge];
        if (!e) continue;
        const a = posPayer(e.payer);
        const b = posCreator(e.creator);
        const { x, y } = bez(a, b, pu.t);
        const nearEnd = pu.t > 0.88;
        ctx.globalAlpha = (nearEnd ? (1 - pu.t) / 0.12 : 1) * (pu.real ? 0.95 : 0.45);
        ctx.fillStyle = nearEnd ? pal.settled : pal.flow;
        ctx.beginPath();
        ctx.arc(x, y, pu.real ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // window label
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = pal.low;
      ctx.fillText(`real settlements · ${windowLabel}`, 12, H - 10);
    }

    if (reduce) {
      draw(0);
      // reduced motion still updates the static graph when new data lands (no pulses)
    }

    // ── live polling: fire REAL pulses on new settled receipts ──
    const known = new Set(receipts.filter((r) => r.status === "settled").map((r) => r.id));
    let lastReal = 0;
    let alive = true;
    const poll = async () => {
      try {
        const [rc, rs] = await Promise.all([
          fetch("/api/sluice/receipts", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<ReceiptDTO[]>) : null)),
          fetch("/api/sluice/resources", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<ResourceLite[]>) : null)),
        ]);
        if (!alive || !rc || !rs) return;
        const rebuilt = build(rc, rs);
        edges = rebuilt.edges;
        windowLabel = rebuilt.windowLabel;
        const byId = new Map(rs.map((r) => [r.id, r] as const));
        for (const r of rc) {
          if (r.status !== "settled" || known.has(r.id)) continue;
          known.add(r.id);
          const res = byId.get(r.resourceId);
          const idx = edges.findIndex((e) => e.payer === r.payer && e.creator === res?.payTo);
          if (idx >= 0 && !reduce) {
            pulses.push({ edge: idx, t: 0, speed: 0.010 + Math.random() * 0.004, real: true });
            lastReal = performance.now();
            setStatus({
              mode: "live",
              text: `live — just settled ${r.formattedAmount} → ${(r.resourceName ?? "creator").slice(0, 24)}`,
            });
          }
        }
        if (reduce) draw(0);
      } catch {
        /* poll is best-effort */
      }
    };
    const pollId = setInterval(poll, 12_000);

    if (reduce) {
      return () => {
        alive = false;
        clearInterval(pollId);
        themeObs.disconnect();
        ro.disconnect();
      };
    }

    // ── animation loop with ambient history replay when quiet ──
    let raf = 0;
    let running = true;
    let lastAmbient = 0;
    const frame = (now: number) => {
      // ambient: if no real settlement in the last 20s, replay history at a gentle rate
      if (now - lastReal > 20_000 && now - lastAmbient > 2_400 && edges.length > 0) {
        lastAmbient = now;
        pulses.push({ edge: Math.floor(Math.random() * edges.length), t: 0, speed: 0.007 + Math.random() * 0.004, real: false });
        setStatus((s) => (s.mode !== "replay" ? { mode: "replay", text: "quiet right now — replaying recent settlements" } : s));
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i]!;
        pu.t += pu.speed;
        if (pu.t >= 1) {
          const e = edges[pu.edge];
          if (e) flashes.push({ creator: e.creator, t0: now, real: pu.real });
          if (flashes.length > 24) flashes.shift();
          pulses.splice(i, 1);
        }
      }
      draw(now);
      if (running) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => (e?.isIntersecting ? start() : stop()), { threshold: 0.05 });
    io.observe(wrap);
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      stop();
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
      themeObs.disconnect();
      ro.disconnect();
    };
  }, [initial, build, receipts]);

  if (initial.edges.length === 0) {
    return (
      <div className={`grid place-items-center ${className ?? ""}`}>
        <p className="text-sm text-low">No settlements yet — the economy starts with the first payment.</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="absolute bottom-2.5 right-3 flex items-center gap-2 text-[11px] text-low">
        <span
          className="inline-block size-1.5 rounded-full"
          style={{ backgroundColor: status.mode === "live" ? "var(--settled)" : "var(--text-low)" }}
        />
        {status.text}
      </div>
    </div>
  );
}
