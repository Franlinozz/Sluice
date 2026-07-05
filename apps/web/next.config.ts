import type { NextConfig } from "next";

// Optional wallet-connector packages that wagmi v3 references via guarded dynamic import()
// but that we don't install/use. Alias them to an empty stub so the bundler can resolve them.
const OPTIONAL_WALLET_STUB = "./src/stubs/empty.ts";
const optionalWalletDeps = [
  "accounts",
  "cbw-sdk",
  "porto",
  "porto/internal",
  "porto/wagmi",
  "@base-org/account",
  "@metamask/connect-evm",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Public API proxy (Overhaul rule 14): the VPS API is reachable at /gw/* on this domain so no
  // raw IP:port ever appears in docs, samples, or UI. The origin lives in env only (API_URL).
  async rewrites() {
    const api = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
    if (!api) return [];
    return [{ source: "/gw/:path*", destination: `${api.replace(/\/$/, "")}/:path*` }];
  },
  // Workspace packages are shipped as TS source and transpiled by Next.
  transpilePackages: ["@sluice/ui", "@sluice/chain", "@sluice/money"],
  experimental: {
    optimizePackageImports: ["lucide-react", "@sluice/ui"],
  },
  turbopack: {
    resolveAlias: Object.fromEntries(optionalWalletDeps.map((d) => [d, OPTIONAL_WALLET_STUB])),
  },
};

export default nextConfig;
