import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@sluice/ui";
import { SiteHeader } from "@/components/marketing/site-header";
import { EmptyState } from "@/components/shell/page-parts";

export const metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <EmptyState
          icon={BookOpen}
          title="Docs are on the way"
          description="Quickstart, Concepts (the Meter, Units, Streaming, the Citation Toll, Splits, Reputation), Connectors, the SDK + MCP reference, RSL compatibility, and self-hosting — shipping with the protocol."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/">
                <ArrowLeft className="size-4" /> Back home
              </Link>
            </Button>
          }
        />
      </main>
    </div>
  );
}
