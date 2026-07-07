"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button, cn } from "@sluice/ui";

/**
 * The 60-second tour (R4): five steps over REAL surfaces — no screenshots. Root-mounted so it can
 * navigate across the console (/app/*) and the public Ask page. Spotlights the live element via a
 * dimmed overlay cut-out; skippable (Esc), keyboard-navigable (←/→/Enter), and remembers
 * completion (localStorage; upgraded to the profile in R5). Relaunch from the header "?".
 */
interface Step {
  path: string;
  target: string; // [data-tour=…] selector
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    path: "/app",
    target: '[data-tour="workspace"]',
    title: "A toll booth for the AI-read web",
    body: "Machines read the web without paying. Sluice makes the smallest unit of work sellable — and every number you see here is a real payment.",
  },
  {
    path: "/app/earn",
    target: '[data-tour="earn"]',
    title: "Creators price the smallest unit",
    body: "An article, a feed, a stream — priced per read, per second, or per citation. Down to a millionth of a dollar.",
  },
  {
    path: "/app/spend",
    target: '[data-tour="spend"]',
    title: "Agents pay per use — and decide",
    body: "Give an AI a budget. It reasons about what's worth paying for, pays for exactly that, and shows you every decision.",
  },
  {
    path: "/ask",
    target: '[data-tour="ask"]',
    title: "Watch an AI pay every source it cites",
    body: "Ask a question here and the agent pays each source it grounds on — the payment IS the citation.",
  },
  {
    path: "/app/settlements",
    target: '[data-tour="verify"]',
    title: "Every payment has a receipt on Arc",
    body: "Don't take our word for anything: every payment leaves a receipt you can check yourself, down to the chain.",
  },
];

const DONE_KEY = "sluice-tour-done";

export function startTour() {
  window.dispatchEvent(new CustomEvent("sluice:tour"));
}

export function Tour() {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = React.useState<number | null>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // launch: header "?" event, or auto on the first console visit
  React.useEffect(() => {
    const onStart = () => setStep(0);
    window.addEventListener("sluice:tour", onStart);
    return () => window.removeEventListener("sluice:tour", onStart);
  }, []);
  React.useEffect(() => {
    if (step === null && pathname.startsWith("/app") && !localStorage.getItem(DONE_KEY)) {
      const t = setTimeout(() => setStep(0), 1200);
      return () => clearTimeout(t);
    }
  }, [pathname, step]);

  const finish = React.useCallback(() => {
    localStorage.setItem(DONE_KEY, "1");
    setStep(null);
    setRect(null);
  }, []);

  // navigate to the step's page, then find + measure its real target
  React.useEffect(() => {
    if (step === null) return;
    const s = STEPS[step]!;
    if (pathname !== s.path) {
      router.push(s.path);
      return; // pathname change re-runs this effect
    }
    let tries = 0;
    let raf = 0;
    const find = () => {
      const el = document.querySelector(s.target);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
        setRect(el.getBoundingClientRect());
        cardRef.current?.focus();
      } else if (++tries < 40) {
        raf = window.setTimeout(find, 100);
      } else {
        setRect(null); // target missing → still show the card, centered
      }
    };
    find();
    const onMove = () => {
      const el = document.querySelector(s.target);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      clearTimeout(raf);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [step, pathname, router]);

  // keyboard
  React.useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        setStep((s) => (s !== null && s < STEPS.length - 1 ? s + 1 : (finish(), null)));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((s) => (s !== null && s > 0 ? s - 1 : s));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, finish]);

  if (step === null) return null;
  const s = STEPS[step]!;
  const onPage = pathname === s.path;

  // spotlight geometry
  const pad = 8;
  const spot = rect
    ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;
  // card position: below the spotlight if it fits, else above, else centered.
  // Both the card and the spotlight are placed via TRANSFORM (top/left stay 0): transform moves
  // composite only and is excluded from CLS — animating top/left here scored 0.3 CLS on /app.
  const cardW = 360;
  let cardStyle: React.CSSProperties = {
    top: 0,
    left: 0,
    transform: `translate(${Math.max(12, (window.innerWidth - cardW) / 2)}px, ${Math.max(12, window.innerHeight / 2 - 100)}px)`,
  };
  if (spot) {
    const below = spot.top + spot.height + 16;
    const fitsBelow = below + 190 < window.innerHeight;
    const x = Math.max(12, Math.min(window.innerWidth - cardW - 12, spot.left));
    const y = fitsBelow ? below : Math.max(12, spot.top - 206);
    cardStyle = { top: 0, left: 0, transform: `translate(${x}px, ${y}px)` };
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Tour step ${step + 1} of ${STEPS.length}: ${s.title}`}>
      {/* dim + spotlight cut-out */}
      {spot ? (
        <div
          className="absolute rounded-[14px] transition-all duration-300"
          style={{
            top: 0,
            left: 0,
            width: spot.width,
            height: spot.height,
            transform: `translate(${spot.left}px, ${spot.top}px)`,
            boxShadow: "0 0 0 9999px rgba(4,5,6,0.72), 0 0 0 1.5px var(--flow), 0 0 32px var(--flow-glow)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(4,5,6,0.72)]" onClick={finish} />
      )}

      {/* the step card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        className="absolute w-[360px] max-w-[calc(100vw-24px)] rounded-card border border-edge bg-surface-1 p-5 shadow-[var(--shadow-pop)] outline-none transition-all duration-300"
        style={cardStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-low">
            {step + 1} / {STEPS.length}
          </span>
          <button onClick={finish} aria-label="Skip tour" className="rounded-md p-1 text-low hover:bg-surface-2 hover:text-hi">
            <X className="size-4" />
          </button>
        </div>
        <h2 className="mt-2 font-display text-base font-semibold text-hi">{s.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-mid">{!onPage ? "Taking you there…" : s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-xs text-low underline-offset-4 hover:text-mid hover:underline">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)} aria-label="Previous step">
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}
            >
              {step < STEPS.length - 1 ? (
                <>
                  Next <ArrowRight className="size-4" />
                </>
              ) : (
                "Done — start using it"
              )}
            </Button>
          </div>
        </div>
        {/* progress dots */}
        <div className="mt-3 flex items-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn("h-1 rounded-full transition-all", i === step ? "w-5" : "w-1.5")}
              style={{ backgroundColor: i === step ? "var(--flow)" : "var(--border-emphasis)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The header "?" that relaunches the tour. */
export function TourButton({ className }: { className?: string }) {
  return (
    <button
      onClick={startTour}
      aria-label="Take the 60-second tour"
      title="Take the 60-second tour"
      className={cn(
        "grid size-8 place-items-center rounded-[8px] border border-hairline text-mid transition-colors hover:bg-surface-2 hover:text-hi",
        className,
      )}
    >
      <span className="font-mono text-sm">?</span>
    </button>
  );
}
