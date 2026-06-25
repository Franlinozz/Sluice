"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, FileText } from "lucide-react";
import { cn } from "@sluice/ui";

export interface DocNav {
  slug: string;
  title: string;
  group: string;
  description: string;
}
export interface DocHeadingNav {
  id: string;
  text: string;
}

/** Top reading-progress bar driven by scroll position. */
function ReadingProgress() {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? (el.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
      <div className="h-full bg-signal transition-[width] duration-150" style={{ width: `${p}%` }} />
    </div>
  );
}

/** Scroll-spy table of contents for the current page. */
function Toc({ headings }: { headings: DocHeadingNav[] }) {
  const [active, setActive] = React.useState(headings[0]?.id);
  React.useEffect(() => {
    if (headings.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: [0, 1] },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;
  return (
    <nav className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] overflow-auto xl:block">
      <div className="eyebrow mb-3">On this page</div>
      <ul className="flex flex-col gap-2 border-l border-hairline">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "-ml-px block border-l-2 pl-3 text-xs leading-snug transition-colors",
                active === h.id ? "border-steel text-hi" : "border-transparent text-low hover:text-mid",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Sidebar({ pages, current }: { pages: DocNav[]; current: string }) {
  const groups = Array.from(new Set(pages.map((p) => p.group)));
  return (
    <nav className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g}>
          <div className="eyebrow mb-2">{g}</div>
          <ul className="flex flex-col gap-0.5">
            {pages
              .filter((p) => p.group === g)
              .map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/docs/${p.slug}`}
                    className={cn(
                      "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      current === p.slug
                        ? "bg-surface-2 font-medium text-hi"
                        : "text-mid hover:bg-surface-1 hover:text-hi",
                    )}
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <div>
        <div className="eyebrow mb-2">Resources</div>
        <a
          href="/sluice-whitepaper.pdf"
          target="_blank"
          rel="noreferrer"
          className="block rounded-md px-2.5 py-1.5 text-sm text-mid transition-colors hover:bg-surface-1 hover:text-hi"
        >
          Whitepaper (PDF) ↗
        </a>
      </div>
    </nav>
  );
}

function CommandK({ pages }: { pages: DocNav[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = React.useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return pages;
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(n) ||
        p.group.toLowerCase().includes(n) ||
        p.description.toLowerCase().includes(n),
    );
  }, [pages, q]);

  React.useEffect(() => setIdx(0), [q]);

  const go = (slug: string) => {
    setOpen(false);
    setQ("");
    router.push(`/docs/${slug}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-[10px] border border-edge bg-surface-1 px-3 py-2 text-left text-sm text-low hover:border-steel/40"
      >
        <Search className="size-4" />
        <span className="flex-1">Search docs…</span>
        <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-mid">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-canvas/70 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-card border border-edge bg-surface-1 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-hairline px-4">
              <Search className="size-4 text-low" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") setIdx((i) => Math.min(i + 1, results.length - 1));
                  else if (e.key === "ArrowUp") setIdx((i) => Math.max(i - 1, 0));
                  else if (e.key === "Enter" && results[idx]) go(results[idx]!.slug);
                }}
                placeholder="Search documentation…"
                className="h-12 w-full bg-transparent text-sm text-hi placeholder:text-low focus:outline-none"
              />
            </div>
            <ul className="max-h-80 overflow-auto p-2">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-low">No matches</li>}
              {results.map((p, i) => (
                <li key={p.slug}>
                  <button
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => go(p.slug)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left",
                      i === idx ? "bg-surface-2" : "hover:bg-surface-2",
                    )}
                  >
                    <FileText className="mt-0.5 size-4 shrink-0 text-low" />
                    <span className="min-w-0">
                      <span className="block text-sm text-hi">{p.title}</span>
                      <span className="block truncate text-xs text-low">{p.description}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-low">{p.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export function DocsChrome({
  pages,
  headings,
  children,
}: {
  pages: DocNav[];
  headings: DocHeadingNav[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = pathname.replace(/^\/docs\/?/, "") || pages[0]!.slug;

  return (
    <>
      <ReadingProgress />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_180px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] flex-col gap-5 overflow-auto pr-2">
            <CommandK pages={pages} />
            <Sidebar pages={pages} current={current} />
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-6 lg:hidden">
            <CommandK pages={pages} />
          </div>
          {children}
        </div>
        <Toc headings={headings} />
      </div>
    </>
  );
}
