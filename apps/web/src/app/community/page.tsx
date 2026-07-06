import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { Card, Pill } from "@sluice/ui";
import { SiteHeader } from "@/components/marketing/site-header";
import { sanitizeLabel } from "@/lib/sanitize";

export const metadata = {
  title: "Community",
  description: "Real people using Sluice — profiles, what they did, when. Honest counts only.",
};
export const dynamic = "force-dynamic";

interface CommunityProfile {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
  invitedBy: string | null;
  questionsAsked: number;
  resourcesRegistered: number;
}

const BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default async function CommunityPage() {
  const people: CommunityProfile[] = await fetch(`${BASE}/community`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <p className="eyebrow">Community · real humans only</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-hi sm:text-4xl">
          The people using Sluice.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mid">
          Every card is one human who opted in — however many wallets they use, they count once.
          When we say {people.length === 1 ? "“1 person”, we mean one person" : `“${people.length} people”, we mean ${people.length} humans`}.
        </p>

        {people.length === 0 ? (
          <Card className="mt-8 flex flex-col items-center gap-3 p-10 text-center">
            <Users className="size-6 text-low" />
            <p className="text-sm text-mid">
              Nobody has gone public yet. Be the first —{" "}
              <Link href="/join" className="text-steel hover:underline">
                join in ~3 minutes
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {people.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-hairline bg-surface-2 font-display text-sm text-hi">
                    {sanitizeLabel(p.displayName, 40).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-hi">{sanitizeLabel(p.displayName, 40)}</span>
                      {p.handle && <span className="font-mono text-xs text-steel">@{p.handle}</span>}
                      {p.invitedBy && (
                        <span className="text-xs text-low">invited by @{sanitizeLabel(p.invitedBy, 24)}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-low">
                      joined {new Date(p.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {p.questionsAsked > 0 && (
                    <Pill tone="info" dot>
                      {p.questionsAsked} asked
                    </Pill>
                  )}
                  {p.resourcesRegistered > 0 && (
                    <Pill tone="settled" dot>
                      {p.resourcesRegistered} registered
                    </Pill>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between rounded-card border border-hairline bg-surface-1/40 p-5">
          <p className="text-sm text-mid">Know a creator or a builder? Get them to their first real receipt.</p>
          <Link
            href="/join"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-signal px-4 py-2 text-sm font-medium text-signal-contrast hover:opacity-90"
          >
            Invite via /join <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
