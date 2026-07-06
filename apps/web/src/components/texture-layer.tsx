"use client";

import * as React from "react";

/**
 * The dotted depth texture (R1), loaded OFF the critical path: the image URL is applied on idle so
 * it never competes with LCP — it's decoration, not content. CSS (tokens.css) handles blend/opacity.
 */
export function TextureLayer() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => {
      el.style.backgroundImage = 'url("/brand/texture-dots.webp")';
    };
    if ("requestIdleCallback" in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(set, { timeout: 2000 });
    } else {
      setTimeout(set, 700);
    }
  }, []);
  return <div ref={ref} aria-hidden className="texture-layer" />;
}
