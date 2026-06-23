"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Logo,
  NetworkBadge,
  Button,
} from "@sluice/ui";
import { primaryNav, secondaryNav } from "@/lib/nav";
import { useArcStatus } from "@/components/wallet/use-arc-status";
import { WalletButton } from "@/components/wallet/wallet-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandMenu } from "./command-menu";
import { NavLink } from "./sidebar";

export function Topbar() {
  const { status } = useArcStatus();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-canvas/80 px-4 backdrop-blur-md sm:px-6">
      <MobileNav />
      <Link href="/" className="lg:hidden" aria-label="Sluice home">
        <Logo withWordmark={false} />
      </Link>
      <span className="hidden text-sm text-low lg:inline">Personal workspace</span>

      <div className="ml-auto flex items-center gap-2">
        <CommandMenu />
        <NetworkBadge name="Arc Testnet" status={status} className="hidden sm:inline-flex" />
        <ThemeToggle />
        <WalletButton />
      </div>
    </header>
  );
}

function MobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <DialogContent className="left-0 top-0 h-dvh max-w-[280px] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="space-y-0.5 px-3 py-2">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />
          ))}
          <div className="my-2 h-px bg-hairline" />
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
