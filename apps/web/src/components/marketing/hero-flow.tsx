"use client";

import * as React from "react";
import { GLYPH_VIEWBOX, GLYPH_G } from "@sluice/ui";

/**
 * THE HERO (Overhaul R3) — the logo itself, alive. The Sluice mark is a valve on a line, so the
 * hero IS that schematic: a luminous pipe spans the viewport; a continuous stream of tiny value
 * particles flows in along converging trace-lanes (the brand banner motif, animated), compresses
 * into the gate glyph, a meter pulse fires, and discrete brighter "settled drops" exit right,
 * fading into small receipt ticks. Occasionally a REAL recent settlement amount floats up from
 * the gate (passed in from the receipts API — never invented).
 *
 * Plain <canvas> 2D + rAF (no three.js). DPR capped at 2; sprite-based glows (no shadowBlur);
 * pauses when the tab is hidden or the hero is scrolled away. Light/dark palettes read from the
 * live CSS tokens. prefers-reduced-motion renders the static schematic with the latest real
 * settlement printed — designed, not degraded.
 */

export interface HeroReceipt {
  formattedAmount: string;
  unitType: string;
}

// ── glyph geometry (from the generated brand paths) ──────────────────────────
const [GVX, GVY, GVW, GVH] = GLYPH_VIEWBOX.split(" ").map(Number) as [number, number, number, number];
const GLYPH_D = /d="([^"]+)"/.exec(GLYPH_G)?.[1]?.replace(/\s+/g, " ") ?? "";

function drawGlyph(ctx: CanvasRenderingContext2D, path: Path2D, gx: number, gy: number, h: number, color: string, alpha: number) {
  const s = h / GVH;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.translate(gx - (GVX + GVW / 2) * s, gy - (GVY + GVH / 2) * s);
  ctx.scale(s, s);
  // potrace emitted coordinates in a 10x, y-flipped space:
  ctx.translate(0, 1254);
  ctx.scale(0.1, -0.1);
  ctx.fill(path);
  ctx.restore();
}

/** Radial glow sprite (drawImage beats shadowBlur by an order of magnitude). */
function makeSprite(size: number, rgb: string, coreAlpha: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},${coreAlpha})`);
  grad.addColorStop(0.35, `rgba(${rgb},${coreAlpha * 0.45})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function cssRgb(v: string): string {
  // #rrggbb → "r,g,b"
  const m = /^#?([0-9a-f]{6})$/i.exec(v.trim());
  if (!m) return "111,227,240";
  const n = parseInt(m[1]!, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

interface Palette {
  flow: string;
  flowRgb: string;
  steelRgb: string;
  hi: string;
  low: string;
  dark: boolean;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const theme = document.documentElement.getAttribute("data-theme") ?? "dark";
  return {
    flow: cs.getPropertyValue("--flow").trim() || "#6FE3F0",
    flowRgb: cssRgb(cs.getPropertyValue("--flow").trim() || "#6FE3F0"),
    steelRgb: cssRgb(theme === "light" ? "#46566a" : "#9da7b3"),
    hi: cs.getPropertyValue("--text-hi").trim() || "#f4f5f6",
    low: cs.getPropertyValue("--text-low").trim() || "#6a6e76",
    dark: theme !== "light",
  };
}

// ── the static schematic (reduced-motion + pre-hydration baseline) ───────────
export function HeroSchematic({ latest }: { latest?: HeroReceipt }) {
  const label = latest
    ? `${latest.formattedAmount} · ${latest.unitType.replace("per_", "per ")} — settled on Arc`
    : "metered → gated → settled on Arc";
  return (
    <svg viewBox="0 0 1200 360" className="h-full w-full text-hi" aria-label="The Sluice: value flows in, is metered at the gate, and settles as discrete receipts.">
      {/* converging trace lanes (the banner motif) */}
      {[-84, -56, -30, 30, 56, 84].map((off) => (
        <path
          key={off}
          d={`M0 ${180 + off} C 260 ${180 + off}, 400 ${180 + off * 0.5}, 480 180`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.10"
        />
      ))}
      {/* the pipe */}
      <line x1="0" y1="180" x2="1200" y2="180" stroke="currentColor" strokeWidth="1" opacity="0.22" />
      {/* inflow dots riding the lanes */}
      {[
        [70, -62],
        [150, 38],
        [230, -24],
        [310, 44],
        [390, -12],
        [450, 6],
      ].map(([x, off], i) => (
        <circle key={x} cx={x} cy={180 + (off ?? 0) * (1 - x! / 520)} r="1.7" fill="currentColor" opacity={0.22 + i * 0.05} />
      ))}
      {/* the gate glyph */}
      <g transform={`translate(${600 - (GVX + GVW / 2) * (130 / GVH)}, ${180 - (GVY + GVH / 2) * (130 / GVH)}) scale(${130 / GVH})`}>
        <g dangerouslySetInnerHTML={{ __html: GLYPH_G }} />
      </g>
      {/* settled drops exiting */}
      {[700, 790, 880, 970].map((x, i) => (
        <g key={x} opacity={0.9 - i * 0.22}>
          <circle cx={x} cy="180" r="2.6" fill="var(--flow)" />
          <line x1={x} y1="172" x2={x} y2="188" stroke="var(--flow)" strokeWidth="0.75" opacity="0.35" />
        </g>
      ))}
      {/* the latest REAL settlement, printed */}
      <text x="600" y="120" textAnchor="middle" fontFamily="var(--font-mono, monospace)" fontSize="13" fill="var(--flow)" opacity="0.9">
        {label}
      </text>
      <text x="600" y="322" textAnchor="middle" fontFamily="var(--font-mono, monospace)" fontSize="11" fill="currentColor" opacity="0.35">
        metered → gated → settled
      </text>
    </svg>
  );
}

// ── the living hero ──────────────────────────────────────────────────────────
interface Particle {
  lane: number;
  x: number;
  v: number;
  a: number;
  r: number;
  jitter: number;
}
interface Drop {
  x: number;
  v: number;
  born: number;
}
interface Floater {
  text: string;
  born: number;
}

export function HeroFlow({ receipts, className }: { receipts: HeroReceipt[]; className?: string }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const bgCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [animated, setAnimated] = React.useState(false);
  const receiptsRef = React.useRef(receipts);
  receiptsRef.current = receipts;

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // static schematic stays
    if (new URLSearchParams(window.location.search).has("noanim")) return; // perf bisect switch
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let pal = readPalette();
    let glowFlow = makeSprite(64, pal.flowRgb, 0.85);
    let glowSoft = makeSprite(48, pal.dark ? pal.flowRgb : pal.steelRgb, 0.5);
    const glyphPath = new Path2D(GLYPH_D);


    let W = 0, H = 0, dpr = 1;
    const LANES = 12;
    let laneOffsets: number[] = [];
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      W = r.width;
      H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      laneOffsets = Array.from({ length: LANES }, (_, i) => {
        const t = (i / (LANES - 1)) * 2 - 1; // -1..1
        return Math.sign(t) * Math.pow(Math.abs(t), 1.25) * H * 0.26;
      });
    };

    const cy = () => H * 0.5;
    const gateH = () => Math.min(H * 0.36, 132);
    const gateHalf = () => (gateH() / GVH) * GVW * 0.5;
    const convergeX = () => W / 2 - gateHalf() * 0.72;

    // ── offscreen caches: rasterize the expensive statics ONCE per resize/theme ──
    // (per-frame Path2D fills + polylines are what kill software-rendered canvases)
    let bgCache: HTMLCanvasElement | null = null;
    let glyphBase: HTMLCanvasElement | null = null;
    let glyphFlash: HTMLCanvasElement | null = null;
    const buildCaches = () => {
      if (W < 4 || H < 4) return;
      bgCache = document.createElement("canvas");
      bgCache.width = Math.floor(W * dpr);
      bgCache.height = Math.floor(H * dpr);
      const bg = bgCache.getContext("2d")!;
      bg.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gateIn0 = W / 2 - gateHalf() * 0.7;
      bg.lineWidth = 1;
      bg.strokeStyle = `rgba(${pal.steelRgb},${pal.dark ? 0.09 : 0.13})`;
      for (let l = 0; l < LANES; l++) {
        bg.beginPath();
        for (let x = 0; x <= gateIn0 + 4; x += 26) {
          const y = laneY(l, x);
          if (x === 0) bg.moveTo(x, y);
          else bg.lineTo(x, y);
        }
        bg.stroke();
      }
      const grad = bg.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, `rgba(${pal.steelRgb},0.08)`);
      grad.addColorStop(0.5, `rgba(${pal.steelRgb},${pal.dark ? 0.4 : 0.5})`);
      grad.addColorStop(1, `rgba(${pal.steelRgb},0.08)`);
      bg.strokeStyle = grad;
      bg.beginPath();
      bg.moveTo(0, cy());
      bg.lineTo(W, cy());
      bg.stroke();

      const mkGlyph = (color: string) => {
        const gh = gateH();
        const gw = (gh / GVH) * GVW;
        const c = document.createElement("canvas");
        c.width = Math.ceil(gw * dpr) + 4;
        c.height = Math.ceil(gh * dpr) + 4;
        const g = c.getContext("2d")!;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawGlyph(g, glyphPath, gw / 2 + 2 / dpr, gh / 2 + 2 / dpr, gh, color, 1);
        return c;
      };
      glyphBase = mkGlyph(pal.hi);
      glyphFlash = mkGlyph(pal.flow);

      // paint the static layer element once (bg canvas): lanes+pipe, ambient glow, base glyph
      const bgEl = bgCanvasRef.current;
      if (bgEl) {
        bgEl.width = Math.floor(W * dpr);
        bgEl.height = Math.floor(H * dpr);
        const bctx = bgEl.getContext("2d")!;
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        bctx.clearRect(0, 0, W, H);
        bctx.drawImage(bgCache!, 0, 0, W, H);
        if (pal.dark) {
          bctx.globalAlpha = 0.10;
          const amb = gateH() * 2.1;
          bctx.drawImage(glowFlow, W / 2 - amb / 2, cy() - amb / 2, amb, amb);
          bctx.globalAlpha = 1;
        }
        const gh = gateH();
        const gw = (gh / GVH) * GVW;
        bctx.globalAlpha = pal.dark ? 0.92 : 0.85;
        bctx.drawImage(glyphBase, W / 2 - gw / 2 - 2 / dpr, cy() - gh / 2 - 2 / dpr, gw + 4 / dpr, gh + 4 / dpr);
        bctx.globalAlpha = 1;
      }
    };
    const blitGlyph = (img: HTMLCanvasElement, alpha: number) => {
      const gh = gateH();
      const gw = (gh / GVH) * GVW;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, W / 2 - gw / 2 - 2 / dpr, cy() - gh / 2 - 2 / dpr, gw + 4 / dpr, gh + 4 / dpr);
      ctx.globalAlpha = 1;
    };

    const laneY = (lane: number, x: number) => {
      const cx0 = convergeX();
      const t = Math.min(1, Math.max(0, x / cx0));
      const ease = Math.pow(1 - t, 1.55);
      return cy() + laneOffsets[lane]! * ease;
    };

    resize();
    buildCaches();
    const ro = new ResizeObserver(() => {
      resize();
      buildCaches();
    });
    ro.observe(wrap);

    const themeObs = new MutationObserver(() => {
      pal = readPalette();
      glowFlow = makeSprite(64, pal.flowRgb, 0.85);
      glowSoft = makeSprite(48, pal.dark ? pal.flowRgb : pal.steelRgb, 0.5);
      buildCaches();
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const COUNT = Math.max(160, Math.min(280, Math.floor(W / 4.5)));
    const parts: Particle[] = Array.from({ length: COUNT }, () => spawn(true));
    function spawn(seed = false): Particle {
      const gateIn = W / 2 - gateHalf() * 0.7;
      return {
        lane: Math.floor(Math.random() * LANES),
        x: seed ? Math.random() * gateIn : -(Math.random() * W * 0.18) - 6,
        v: 42 + Math.random() * 58,
        a: 0.16 + Math.random() * 0.3,
        r: 0.9 + Math.random() * 0.9,
        jitter: (Math.random() - 0.5) * 2.2,
      };
    }

    const drops: Drop[] = [];
    const floaters: Floater[] = [];
    let metered = 0;
    let pulseT = -10; // seconds since epoch of last pulse (start silent)
    let lastFloat = performance.now() / 1000 + 1.5;

    let raf = 0;
    let last = performance.now();
    let running = true;

    const frame = (nowMs: number) => {
      const now = nowMs / 1000;
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      const gateIn = W / 2 - gateHalf() * 0.7;
      const gateOut = W / 2 + gateHalf() * 0.62;

      ctx.clearRect(0, 0, W, H); // statics live on the layered bg canvas — nothing re-blits here

      // inflow particles (source-over: additive across the full canvas kills software raster)
      for (const p of parts) {
        p.x += p.v * dt;
        if (p.x >= gateIn) {
          metered++;
          Object.assign(p, spawn());
          continue;
        }
        const y = laneY(p.lane, p.x) + p.jitter;
        const near = p.x / gateIn; // brighten slightly as they approach the gate
        const fadeIn = Math.min(1, Math.max(0, p.x / (gateIn * 0.14))); // no hard pop at the left edge
        ctx.globalAlpha = p.a * (0.7 + near * 0.5) * fadeIn;
        const s = p.r * 4.5;
        ctx.drawImage(glowSoft, p.x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      // meter pulse: every ~22 metered particles, the gate counts a batch
      if (metered >= 22) {
        metered = 0;
        pulseT = now;
        drops.push({ x: gateOut, v: 96 + Math.random() * 40, born: now });
        if (drops.length > 14) drops.shift();
      }

      // the gate glyph (+ flash on pulse)
      const sincePulse = now - pulseT;
      if (sincePulse < 0.55) {
        const k = 1 - sincePulse / 0.55;
        if (pal.dark) ctx.globalCompositeOperation = "lighter";
        if (glyphFlash) blitGlyph(glyphFlash, 0.5 * k);
        const g = gateH() * (1.4 + (1 - k) * 0.9);
        ctx.globalAlpha = 0.5 * k;
        ctx.drawImage(glowFlow, W / 2 - g / 2, cy() - g / 2, g, g);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      // settled drops exiting right — discrete, brighter, fading into receipt ticks
      if (pal.dark) ctx.globalCompositeOperation = "lighter";
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]!;
        d.x += d.v * dt;
        const age = now - d.born;
        const life = 1 - age / 3.2;
        if (life <= 0 || d.x > W + 24) {
          drops.splice(i, 1);
          continue;
        }
        const a = Math.min(1, life * 1.6);
        // receipt ticks left behind
        const tickEvery = 64;
        const traveled = d.x - gateOut;
        for (let tx = gateOut + tickEvery; tx < d.x; tx += tickEvery) {
          const tickAge = (traveled - (tx - gateOut)) / d.v;
          const ta = Math.max(0, a * 0.5 - tickAge * 0.22);
          if (ta > 0.02) {
            ctx.globalAlpha = ta;
            ctx.strokeStyle = pal.flow;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx, cy() - 5);
            ctx.lineTo(tx, cy() + 5);
            ctx.stroke();
          }
        }
        // the drop itself
        ctx.globalAlpha = a;
        const g = 18;
        ctx.drawImage(glowFlow, d.x - g / 2, cy() - g / 2, g, g);
        ctx.fillStyle = pal.flow;
        ctx.beginPath();
        ctx.arc(d.x, cy(), 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // floaters: REAL recent settlement amounts rising from the gate
      const rs = receiptsRef.current;
      if (rs.length > 0 && now - lastFloat > 4.6 + Math.random() * 2 && floaters.length < 2) {
        lastFloat = now;
        const r = rs[Math.floor(Math.random() * Math.min(rs.length, 8))]!;
        floaters.push({ text: `${r.formattedAmount} · ${r.unitType.replace("per_", "per ")}`, born: now });
      }
      ctx.textAlign = "center";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i]!;
        const t = (now - f.born) / 3.0;
        if (t >= 1) {
          floaters.splice(i, 1);
          continue;
        }
        const a = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.85;
        ctx.globalAlpha = a;
        ctx.fillStyle = pal.flow;
        ctx.fillText(f.text, W / 2, cy() - gateH() * 0.62 - 14 - t * 42);
      }
      ctx.globalAlpha = 1;

      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // pause when hidden or scrolled away
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => (e?.isIntersecting ? start() : stop()), { threshold: 0.02 });
    io.observe(wrap);

    running = true;
    raf = requestAnimationFrame(frame);
    setAnimated(true);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
      ro.disconnect();
      themeObs.disconnect();
    };
  }, []);

  // subtle scroll parallax (compositor-only transform on the wrapper)
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(28, window.scrollY * 0.055);
        wrap.style.transform = `translate3d(0, ${y}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`} aria-hidden>
      <div className={`h-full w-full transition-opacity duration-700 ${animated ? "opacity-0" : "opacity-100"}`}>
        <HeroSchematic latest={receipts[0]} />
      </div>
      <canvas
        ref={bgCanvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${animated ? "opacity-100" : "opacity-0"}`}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
