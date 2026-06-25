import * as React from "react";
import { cn } from "@sluice/ui";

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mb-8 text-lg leading-relaxed text-mid">{children}</p>;
}

/** Section heading — `id` powers the scroll-spy TOC + deep links. */
export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 pt-10 font-display text-xl font-semibold tracking-tight text-hi">
      {children}
    </h2>
  );
}

export function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-28 pt-6 font-display text-base font-medium text-hi">
      {children}
    </h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm leading-relaxed text-mid">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 flex flex-col gap-2 text-sm leading-relaxed text-mid">{children}</ul>;
}

export function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-2 size-1 shrink-0 rounded-full bg-steel" />
      <span>{children}</span>
    </li>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[5px] border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-hi">
      {children}
    </code>
  );
}

export function Callout({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "info" | "warn" | "ok";
}) {
  const bar = tone === "warn" ? "var(--pending)" : tone === "ok" ? "var(--settled)" : "var(--steel)";
  return (
    <div
      className="my-5 rounded-card border border-hairline bg-surface-1/50 p-4"
      style={{ borderLeft: `2px solid ${bar}` }}
    >
      {title && <div className="text-sm font-medium text-hi">{title}</div>}
      <div className={cn("text-sm leading-relaxed text-mid", title && "mt-1")}>{children}</div>
    </div>
  );
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="text-steel underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}
