"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
} from "@sluice/ui";
import { allNav } from "@/lib/nav";

/** A real (if basic) ⌘K command palette: filter and jump to any section. */
export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = allNav.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()));

  const go = (href: string, external?: boolean) => {
    setOpen(false);
    setQuery("");
    if (external) window.open(href, "_blank");
    else router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-[10px] border border-hairline bg-surface-1 pl-3 pr-2 text-sm text-low transition-colors hover:border-edge hover:text-mid md:flex"
      >
        <Search className="size-4" />
        <span className="pr-6">Search</span>
        <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-low">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[18%] max-w-lg translate-y-0 p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Command menu</DialogTitle>
          <DialogDescription className="sr-only">
            Search and jump to any section of the console.
          </DialogDescription>

          <div className="flex items-center gap-2.5 border-b border-hairline px-4">
            <Search className="size-4 text-low" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to…"
              className="h-12 w-full bg-transparent text-sm text-hi outline-none placeholder:text-low"
            />
          </div>

          <ul className="max-h-80 overflow-y-auto p-2">
            {results.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => go(item.href, item.external)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm text-mid",
                      "transition-colors hover:bg-surface-2 hover:text-hi",
                    )}
                  >
                    <Icon className="size-4 text-low" />
                    {item.label}
                  </button>
                </li>
              );
            })}
            {results.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-low">No matches</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
