import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/marketing/site-header";

/** /join needs the wallet stack (connect is step 1) — mounted here only, not on the landing. */
export default async function JoinLayout({ children }: { children: React.ReactNode }) {
  const cookie = (await headers()).get("cookie");
  const initialState = cookieToInitialState(wagmiConfig, cookie);
  return (
    <Providers initialState={initialState}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        {children}
      </div>
    </Providers>
  );
}
