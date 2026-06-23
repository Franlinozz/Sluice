"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Logo, cn } from "@sluice/ui";
import { primaryNav, secondaryNav, isNavActive, type NavItem } from "@/lib/nav";

export function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isNavActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors",
        active ? "bg-surface-2 text-hi" : "text-mid hover:bg-surface-2 hover:text-hi",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-steel"
        />
      )}
      <Icon className={cn("size-[18px]", active ? "text-hi" : "text-low")} />
      <span className="truncate">{item.label}</span>
      {item.external && <ArrowUpRight className="ml-auto size-3.5 text-low" />}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[264px] shrink-0 flex-col border-r border-hairline bg-surface-1 lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Sluice home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-hairline px-3 py-3">
        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      <div className="border-t border-hairline px-5 py-3">
        <p className="eyebrow">Settlement layer</p>
        <p className="mt-1 text-xs text-low">Arc Testnet · USDC nanopayments</p>
      </div>
    </aside>
  );
}
