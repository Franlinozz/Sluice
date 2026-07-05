import Link from "next/link";
import { Button, Logo } from "@sluice/ui";
import { arcConfig } from "@sluice/chain";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletButton } from "@/components/wallet/wallet-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/70 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Sluice home">
          <Logo />
        </Link>
        {/* Truly centered between the logo and the right-side controls. */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-sm text-mid md:flex">
          <Link href="/ask" className="transition-colors hover:text-hi">
            Ask the agent
          </Link>
          <Link href="/app" className="transition-colors hover:text-hi">
            Console
          </Link>
          <Link href="/docs" className="transition-colors hover:text-hi">
            Docs
          </Link>
          <a
            href={arcConfig.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-hi"
          >
            Arcscan
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/app">Open app</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
