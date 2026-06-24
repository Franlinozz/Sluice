"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Pause, Play, Square, ZapOff } from "lucide-react";
import { AmountMono, Button, Card, LiveDot, Pill, cn } from "@sluice/ui";
import { formatUSD } from "@sluice/money";
import type { StreamSessionDTO } from "@/lib/api";

const PROXY = "/api/sluice";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const fn = () => setReduced(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, []);
  return reduced;
}

export function LiveMeter({ initial }: { initial: StreamSessionDTO }) {
  const [s, setS] = React.useState<StreamSessionDTO>(initial);
  const [heartbeating, setHeartbeating] = React.useState(initial.status !== "stopped");
  const [displayBase, setDisplayBase] = React.useState<bigint>(BigInt(initial.accrued));
  const reduced = usePrefersReducedMotion();

  // Poll the server (source of truth) every 2s.
  React.useEffect(() => {
    if (s.status === "stopped") return;
    const id = setInterval(async () => {
      const r = await fetch(`${PROXY}/sessions/${initial.id}`, { cache: "no-store" })
        .then((x) => x.json())
        .catch(() => null);
      if (r && r.id) {
        setS(r);
        if (r.status !== "flowing" || reduced) setDisplayBase(BigInt(r.accrued));
      }
    }, 2000);
    return () => clearInterval(id);
  }, [initial.id, s.status, reduced]);

  // Proof-of-flow heartbeat every 2s while enabled (toggle off to simulate flow loss).
  React.useEffect(() => {
    if (s.status === "stopped" || !heartbeating) return;
    const ping = () => fetch(`${PROXY}/sessions/${initial.id}/heartbeat`, { method: "POST" }).catch(() => {});
    ping();
    const id = setInterval(ping, 2000);
    return () => clearInterval(id);
  }, [initial.id, heartbeating, s.status]);

  // Smooth client-side interpolation of accrual while flowing (reduced-motion: snap to server).
  React.useEffect(() => {
    if (s.status !== "flowing" || reduced) return;
    const rate = BigInt(s.rate);
    const cap = BigInt(s.reserve);
    const base = BigInt(s.accrued);
    const start = Date.now();
    const id = setInterval(() => {
      const extra = (rate * BigInt(Date.now() - start)) / 1000n;
      const v = base + extra;
      setDisplayBase(v > cap ? cap : v);
    }, 100);
    return () => clearInterval(id);
  }, [s.status, s.accrued, s.rate, s.reserve, reduced]);

  async function control(action: "pause" | "resume" | "stop") {
    const r = await fetch(`${PROXY}/sessions/${initial.id}/${action}`, { method: "POST" })
      .then((x) => x.json())
      .catch(() => null);
    if (action === "stop") {
      setHeartbeating(false);
      if (r?.session) {
        setS(r.session);
        setDisplayBase(BigInt(r.session.accrued));
        toast.success(`Session settled · ${r.settledSeconds}s`, {
          description: r.paid
            ? `${r.session.formattedSettledAmount} settled via Gateway`
            : r.error ?? "nothing to settle",
        });
      }
      return;
    }
    if (action === "resume") setHeartbeating(true);
    if (r && r.id) {
      setS(r);
      setDisplayBase(BigInt(r.accrued));
    }
  }

  const flowing = s.status === "flowing";
  const stopped = s.status === "stopped";
  const reservePct = (() => {
    const acc = Number(displayBase);
    const res = Number(s.reserve);
    return res > 0 ? Math.min(100, (acc / res) * 100) : 0;
  })();

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow mb-2">accrued · live</div>
            <AmountMono value={formatUSD(displayBase)} size="2xl" dimDecimals />
            <div className="mt-1 text-xs text-low">
              {s.formattedRate}/sec · {s.flowedSeconds}s flowed
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {flowing ? (
              <span className="inline-flex items-center gap-2 text-sm text-hi">
                <LiveDot status={heartbeating ? "live" : "connecting"} /> Flowing
              </span>
            ) : stopped ? (
              <Pill tone="settled" dot>
                stopped
              </Pill>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-mid">
                <LiveDot status="down" /> Paused{s.flowPaused ? " · flow lost" : ""}
              </span>
            )}
          </div>
        </div>

        {/* reserve bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-low">
            <span>reserve used</span>
            <span className="font-mono">
              {formatUSD(displayBase)} / {s.formattedReserve}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={cn("h-full rounded-full transition-[width] duration-200", s.capped ? "bg-pending" : "bg-steel")}
              style={{ width: `${reservePct}%` }}
            />
          </div>
        </div>

        {/* controls */}
        {!stopped && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {flowing ? (
              <Button variant="secondary" size="sm" onClick={() => control("pause")}>
                <Pause className="size-4" /> Pause
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => control("resume")}>
                <Play className="size-4" /> Resume
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => control("stop")}>
              <Square className="size-4" /> Stop &amp; settle
            </Button>
            <Button
              variant={heartbeating ? "ghost" : "outline"}
              size="sm"
              onClick={() => setHeartbeating((h) => !h)}
              title="Toggle the proof-of-flow heartbeat to simulate stream delivery / loss"
            >
              <ZapOff className="size-4" />
              {heartbeating ? "Simulate flow loss" : "Resume heartbeat"}
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Rate" value={`${s.formattedRate}/s`} />
        <Stat label="Reserve" value={s.formattedReserve} />
        <Stat label="Reserve left" value={formatUSD(BigInt(s.reserveRemaining))} />
        <Stat label="Proof-of-flow" value={s.heartbeatFresh && flowing ? "flowing" : "no flow"} />
      </div>

      {stopped && (
        <Card className="p-5">
          <div className="eyebrow mb-2">Settled</div>
          <p className="text-sm text-mid">
            {s.settledSeconds ?? 0}s metered ·{" "}
            <span className="font-mono text-hi">{s.formattedSettledAmount ?? "$0.00"}</span> settled via
            Circle Gateway. Unused reserve was never charged.
          </p>
          <Link
            href="/app/settlements"
            className="mt-3 inline-flex items-center gap-1 text-xs text-steel hover:underline"
          >
            View in Settlement Explorer <ArrowUpRight className="size-3" />
          </Link>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5 font-mono text-sm tnum text-hi">{value}</div>
    </Card>
  );
}
