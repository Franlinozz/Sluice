import * as React from "react";
import Image from "next/image";
import { cn } from "@sluice/ui";

/**
 * EditorialMedia — the one way editorial photography enters the product.
 *
 * Three variants:
 *  - "figure":     a visible, captioned-by-context image in its own rounded frame
 *  - "split":      the image half of a split card (fills its container)
 *  - "background": an absolutely-positioned atmospheric layer behind real content
 *
 * Rules encoded here (see ASSET_AUDIT.md):
 *  - opacity applies to the IMAGE only, per theme (Graphite vs Marble), never the card;
 *  - decorative backgrounds get empty alt; explanatory figures get meaningful alt;
 *  - below-the-fold images lazy-load (next/image default) — pass `priority` only when above the fold;
 *  - aspect-ratio containers prevent layout shift; no parallax anywhere (static layers only,
 *    so prefers-reduced-motion needs no special-casing).
 */
export interface EditorialMediaProps {
  src: string;
  /** Empty string for decorative backgrounds; meaningful text for figures. */
  alt: string;
  variant?: "figure" | "split" | "background";
  /** CSS object-position, e.g. "center 30%". */
  objectPosition?: string;
  /** Image opacity in the dark (Graphite) theme. */
  darkOpacity?: number;
  /** Image opacity in the light (Marble) theme. */
  lightOpacity?: number;
  /** Directional scrim so text stays readable; "none" for framed figures. */
  gradient?: "to-t" | "to-b" | "to-l" | "to-r" | "none";
  priority?: boolean;
  sizes?: string;
  /** Aspect ratio for the "figure" variant container (w/h). Ignored by split/background. */
  aspect?: number;
  className?: string;
}

const GRADIENTS: Record<string, string> = {
  "to-t": "bg-gradient-to-t",
  "to-b": "bg-gradient-to-b",
  "to-l": "bg-gradient-to-l",
  "to-r": "bg-gradient-to-r",
};

export function EditorialMedia({
  src,
  alt,
  variant = "figure",
  objectPosition = "center",
  darkOpacity = 1,
  lightOpacity = 1,
  gradient = "none",
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  aspect = 3 / 2,
  className,
}: EditorialMediaProps) {
  const vars = {
    "--edm-dark": darkOpacity,
    "--edm-light": lightOpacity,
  } as React.CSSProperties;

  const img = (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="editorial-img object-cover"
      style={{ objectPosition }}
    />
  );

  const scrim =
    gradient !== "none" ? (
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", GRADIENTS[gradient], "from-canvas/85 via-canvas/30 to-transparent")} />
    ) : null;

  if (variant === "background") {
    return (
      <div aria-hidden className={cn("absolute inset-0 overflow-hidden", className)} style={vars}>
        {img}
        {scrim}
      </div>
    );
  }

  if (variant === "split") {
    return (
      <div className={cn("relative min-h-40 overflow-hidden", className)} style={vars}>
        {img}
        {scrim}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl border border-edge", className)}
      style={{ ...vars, aspectRatio: String(aspect) }}
    >
      {img}
      {scrim}
    </div>
  );
}
