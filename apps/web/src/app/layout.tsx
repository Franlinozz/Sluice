import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { fontVariables } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sluice — the settlement layer for the agent-paid web",
    template: "%s · Sluice",
  },
  description:
    "Any unit of value — a read, a second, a citation, a listen, a call — metered and settled on Arc in USDC. Creators get paid per use; agents pay per use and decide for themselves.",
  applicationName: "Sluice",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // SSR-safe wagmi hydration from cookies (CLAUDE.md anticipated bugs · Wallet/SSR).
  const cookie = (await headers()).get("cookie");
  const initialState = cookieToInitialState(wagmiConfig, cookie);

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-canvas font-sans text-hi antialiased">
        <ThemeProvider>
          <Providers initialState={initialState}>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
