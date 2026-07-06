import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { UiProviders } from "@/components/ui-providers";
import { TextureLayer } from "@/components/texture-layer";
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
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Sluice",
    title: "Sluice — the settlement layer for the agent-paid web",
    description:
      "Any unit of value — a read, a second, a citation, a listen, a call — metered and settled on Arc in USDC.",
    images: [{ url: "/brand/og-card.png", width: 1200, height: 630, alt: "Sluice" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sluice — the settlement layer for the agent-paid web",
    description: "Make the smallest unit sellable — for humans and machines, settled on Arc.",
    images: ["/brand/og-card.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-canvas font-sans text-hi antialiased">
        <TextureLayer />
        <ThemeProvider>
          <UiProviders>{children}</UiProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
