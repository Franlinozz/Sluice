"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Radio, Quote, FileText, ExternalLink, ArrowRight } from "lucide-react";
import { Badge, Button, Card } from "@sluice/ui";
import type { ResourceDTO } from "@/lib/api";

type Filter = "all" | "stream" | "cite" | "other";

const CITE_UNITS = new Set(["per_citation", "per_read", "per_crawl"]);

function bucket(unitType: string): Exclude<Filter, "all"> {
  if (unitType === "per_second") return "stream";
  if (CITE_UNITS.has(unitType)) return "cite";
  return "other";
}

/** The action a buyer/agent takes for a given resource — every link is a real route. */
function action(r: ResourceDTO): { href: string; label: string; Icon: typeof Radio; external?: boolean } {
  const b = bucket(r.unitType);
  if (b === "stream") return { href: "/app/meter", label: "Stream", Icon: Radio };
  if (b === "cite") return { href: "/ask", label: "Ask & cite", Icon: Quote };
  return { href: r.contentUrl ?? r.endpoint, label: "Open", Icon: ExternalLink, external: true };
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stream", label: "Streams" },
  { key: "cite", label: "Citable" },
  { key: "other", label: "Other" },
];

export function BazaarGrid({ resources }: { resources: ResourceDTO[] }) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return resources.filter((r) => {
      if (filter !== "all" && bucket(r.unitType) !== filter) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        (r.description ?? "").toLowerCase().includes(needle) ||
        (r.author ?? "").toLowerCase().includes(needle) ||
        r.unitType.toLowerCase().includes(needle)
      );
    });
  }, [resources, q, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-low" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search resources…"
            className="h-9 w-full rounded-[10px] border border-edge bg-surface-1 pl-9 pr-3 text-sm text-hi placeholder:text-low focus-visible:border-steel focus-visible:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (filter === f.key
                  ? "border-steel/40 bg-surface-2 text-hi"
                  : "border-edge text-mid hover:text-hi hover:bg-surface-2")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-mid">No resources match your search.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const a = action(r);
            return (
              <Card key={r.id} className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-medium text-hi">{r.name}</div>
                    {r.author && <div className="mt-0.5 truncate text-xs text-low">by {r.author}</div>}
                  </div>
                  <Badge>{r.rateLabel}</Badge>
                </div>

                {r.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-mid">{r.description}</p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <div className="font-mono text-sm text-hi">{r.formattedPrice}</div>
                  <div className="flex items-center gap-2">
                    {r.splitterUrl && (
                      <a
                        href={r.splitterUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-low hover:text-steel"
                        title="On-chain royalty splitter"
                      >
                        <FileText className="size-4" />
                      </a>
                    )}
                    {a.external ? (
                      <Button size="sm" variant="secondary" asChild>
                        <a href={a.href} target="_blank" rel="noreferrer">
                          <a.Icon className="size-4" />
                          {a.label}
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" asChild>
                        <Link href={a.href}>
                          <a.Icon className="size-4" />
                          {a.label}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-low">
        Want a provider to put capital behind a job?{" "}
        <Link href="#broker" className="inline-flex items-center gap-1 text-steel hover:underline">
          Broker a match <ArrowRight className="size-3" />
        </Link>
      </p>
    </div>
  );
}
