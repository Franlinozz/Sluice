"use client";

import * as React from "react";
import { cn } from "../cn.ts";

/**
 * Scroll-triggered fade+rise (Overhaul R2). Transform/opacity only; one orchestrated entrance per
 * view via `delay` stagger. prefers-reduced-motion → renders visible immediately (no observer).
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  /** Stagger delay in ms. */
  delay?: number;
  as?: "div" | "section" | "li" | "span";
  className?: string;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out will-change-transform motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
