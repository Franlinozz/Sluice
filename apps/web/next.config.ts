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
