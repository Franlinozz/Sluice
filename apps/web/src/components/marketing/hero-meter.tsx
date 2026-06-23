"use client";

import * as React from "react";

/**
 * Lightweight canvas "sluice": metered particles flow through a gate and settle as
 * accent drops. ONE animation, theme-aware (reads CSS vars), respects prefers-reduced-motion
 * with a static frame (CLAUDE.md: don't repeat the three.js time-trap; keep it light).
 */
export function HeroMeter({ className }: { className?: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cs = getComputedStyle(document.documentElement);
    const steel = cs.getPropertyValue("--steel").trim() || "#9da7b3";
    const signal = cs.getPropertyValue("--signal").trim() || "#e8eaed";
    const mid = cs.getPropertyValue("--text-mid").trim() || "#a7abb2";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const LANES = 7;
    type P = { x: number; lane: number; v: number; settled: boolean; a: number };
    const gateX = () => w * 0.6;
    const laneY = (lane: number) => h * 0.5 + (lane - (LANES - 1) / 2) * (h * 0.46) / LANES;

    const spawn = (seed = false): P => ({
      lane: Math.floor(Math.random() * LANES),
      x: seed ? Math.random() * w : -Math.random() * w * 0.35 - 10,
      v: 0.5 + Math.random() * 1.1,
      settled: false,
      a: 0,
    });
    const particles: P[] = Array.from({ length: 64 }, () => spawn(true));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const gx = gateX();

      // horizon line
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = steel;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w, h * 0.5);
      ctx.stroke();

      // the gate
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = signal;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, h * 0.16);
      ctx.lineTo(gx, h * 0.84);
      ctx.stroke();

      for (const p of particles) {
        const t = Math.max(0, Math.min(1, p.x / gx));
        const y = laneY(p.lane) + (h * 0.5 - laneY(p.lane)) * t * t;
        if (!p.settled) {
          ctx.globalAlpha = 0.1;
          ctx.strokeStyle = mid;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - 9, y);
          ctx.lineTo(p.x, y);
          ctx.stroke();
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = mid;
          ctx.beginPath();
          ctx.arc(p.x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = Math.max(0, p.a);
          ctx.fillStyle = signal;
          ctx.beginPath();
          ctx.arc(gx + 7, h * 0.5, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    const tick = () => {
      const gx = gateX();
      for (const p of particles) {
        p.x += p.v * (p.x > gx ? 1.7 : 1);
        if (p.x >= gx && !p.settled) {
          p.settled = true;
          p.a = 0.9;
        }
        if (p.settled) {
          p.a -= 0.025;
          if (p.a <= 0) Object.assign(p, spawn());
        } else if (p.x > w + 20) {
          Object.assign(p, spawn());
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    if (reduce) draw();
    else raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
