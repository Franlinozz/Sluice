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
  amount: number; // usd
}

function short(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 5)}…${addr.slice(-3)}` : addr;
}

/**
 * "Watch the economy" — agents (left) paying creators (right), drawn from REAL settled receipts.
 * Each pulse is an actual settlement flowing payer → creator, settling as an accent drop. Light
 * canvas, theme-aware, reduced-motion shows the static graph. Refreshes from the registry.
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
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [edges, setEdges] = React.useState<Edge[]>(() => buildEdges(receipts, resources));

  React.useEffect(() => {
    let alive = true;
    const pull = () =>
      Promise.all([
        fetch("/api/sluice/receipts", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
        fetch("/api/sluice/resources", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([rc, rs]) => {
          if (alive && rc && rs) setEdges(buildEdges(rc as ReceiptDTO[], rs as ResourceLite[]));
        })
        .catch(() => {});
    const id = setInterval(pull, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas || edges.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cs = getComputedStyle(document.documentElement);
    const steel = cs.getPropertyValue("--steel").trim() || "#9da7b3";
    const signal = cs.getPropertyValue("--signal").trim() || "#e8eaed";
    const mid = cs.getPropertyValue("--text-mid").trim() || "#a7abb2";
    const settled = cs.getPropertyValue("--settled").trim() || "#57c98a";

    const payers = Array.from(new Set(edges.map((e) => e.payer)));
    const creators = Array.from(new Set(edges.map((e) => e.creator)));
    const labelOf = new Map(edges.map((e) => [e.creator, e.creatorLabel] as const));

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

    const px = () => w * 0.16;
    const cx = () => w * 0.84;
    const nodeY = (i: number, n: number) => (h * (i + 1)) / (n + 1);

    type Pulse = { edge: Edge; t: number; speed: number };
    const pulses: Pulse[] = [];
    const emit = () => {
      const e = edges[Math.floor(Math.random() * edges.length)]!;
      pulses.push({ edge: e, t: 0, speed: 0.006 + Math.random() * 0.006 });
      if (pulses.length > 40) pulses.shift();
    };

    const posPayer = (p: string) => ({ x: px(), y: nodeY(payers.indexOf(p), payers.length) });
    const posCreator = (c: string) => ({ x: cx(), y: nodeY(creators.indexOf(c), creators.length) });

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // edges
      ctx.lineWidth = 1;
      for (const e of edges) {
        const a = posPayer(e.payer);
        const b = posCreator(e.creator);
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = steel;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y);
        ctx.stroke();
      }

      // nodes — payers (agents)
      ctx.globalAlpha = 1;
      ctx.font = "11px ui-monospace, monospace";
      for (const p of payers) {
        const { x, y } = posPayer(p);
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = mid;
        ctx.textAlign = "right";
        ctx.fillText(short(p), x - 10, y + 3);
      }
      // nodes — creators
      for (const c of creators) {
        const { x, y } = posCreator(c);
        ctx.fillStyle = steel;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = mid;
        ctx.textAlign = "left";
        ctx.fillText(labelOf.get(c) ?? short(c), x + 10, y + 3);
      }

      // pulses
      for (const pu of pulses) {
        const a = posPayer(pu.edge.payer);
        const b = posCreator(pu.edge.creator);
        const t = pu.t;
        const mx = (a.x + b.x) / 2;
        // quadratic-ish position along the bezier
        const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
        const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * b.y + 0 * mx;
        ctx.globalAlpha = t > 0.92 ? (1 - t) / 0.08 : 0.9;
        ctx.fillStyle = t > 0.85 ? settled : signal;
        ctx.beginPath();
        ctx.arc(x, y, t > 0.85 ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (reduce) {
      draw();
      return () => ro.disconnect();
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      if (acc > 700) {
        acc = 0;
        emit();
      }
      for (const pu of pulses) pu.t += pu.speed * (dt / 16.7);
      for (let i = pulses.length - 1; i >= 0; i--) if (pulses[i]!.t >= 1) pulses.splice(i, 1);
      draw();
      raf = requestAnimationFrame(tick);
    };
    emit();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [edges]);

  if (edges.length === 0) {
    return (
      <div className={"grid place-items-center rounded-card border border-hairline bg-surface-1/40 " + (className ?? "")}>
        <p className="text-sm text-low">No settlements yet — the economy starts with the first payment.</p>
      </div>
    );
  }

  return <canvas ref={ref} className={className} aria-hidden />;
}

function buildEdges(receipts: ReceiptDTO[], resources: ResourceLite[]): Edge[] {
  const byId = new Map(resources.map((r) => [r.id, r] as const));
  const seen = new Map<string, Edge>();
  for (const r of receipts) {
    if (r.status !== "settled") continue;
    const res = byId.get(r.resourceId);
    if (!res) continue;
    const key = `${r.payer}->${res.payTo}`;
    const amount = Number(r.grossAmount) / 1e6;
    const existing = seen.get(key);
    if (existing) existing.amount += amount;
    else seen.set(key, { payer: r.payer, creator: res.payTo, creatorLabel: res.name, amount });
  }
  return Array.from(seen.values()).slice(0, 24);
}
