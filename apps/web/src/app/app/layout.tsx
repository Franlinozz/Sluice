import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

/** The console mounts the wallet stack (wagmi + AppKit); marketing pages ship without it. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // SSR-safe wagmi hydration from cookies (CLAUDE.md anticipated bugs · Wallet/SSR).
  const cookie = (await headers()).get("cookie");
  const initialState = cookieToInitialState(wagmiConfig, cookie);

  return (
    <Providers initialState={initialState}>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </Providers>
  );
}
