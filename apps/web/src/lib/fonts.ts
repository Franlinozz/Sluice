/**
 * Self-hosted variable fonts via next/font/local (no CDN, no layout shift — CLAUDE.md theme rule).
 * - display: Space Grotesk (geometric grotesk) for headings / hero
 * - sans:    Inter for UI
 * - mono:    JetBrains Mono for amounts, hashes, rates, chain ids, eyebrows
 * Each exposes a CSS variable consumed by Tailwind's @theme in globals.css.
 */
import localFont from "next/font/local";

export const fontDisplay = localFont({
  src: "../fonts/display.woff2",
  variable: "--ff-display",
  weight: "300 700",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const fontSans = localFont({
  src: "../fonts/sans.woff2",
  variable: "--ff-sans",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const fontMono = localFont({
  src: "../fonts/mono.woff2",
  variable: "--ff-mono",
  weight: "100 800",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`;
