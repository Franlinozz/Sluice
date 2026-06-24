import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { AskBox } from "@/components/ask/ask-box";

export const metadata = {
  title: "Ask the research agent",
  description:
    "Ask a question. The agent answers grounded in registered sources and pays each one it cites — real per-citation settlement on Arc.",
};

export default function AskPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <p className="eyebrow">The citation toll · live</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-hi sm:text-4xl">
          Ask the research agent.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mid sm:text-base">
          It answers grounded in registered sources — and pays a real per-citation nanopayment to
          each source it grounds in. AI pays creators to cite them. Don&apos;t trust it; verify each
          settlement on{" "}
          <Link href="/app/settlements" className="text-steel hover:underline">
            Settlements
          </Link>{" "}
          and Arcscan.
        </p>
        <div className="mt-8">
          <AskBox />
        </div>
      </main>
    </div>
  );
}
