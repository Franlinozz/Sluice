"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, MessageCircleQuestion, ReceiptText } from "lucide-react";
import { AmountMono, Card, Pill, Skeleton, StatusPill } from "@sluice/ui";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { useProfile } from "@/components/people/use-profile";
import { ProviderBadge } from "@/components/people/provider-badge";
import { sanitizeExcerpt } from "@/lib/sanitize";
import type { ReceiptDTO, RecentAnswerDTO } from "@/lib/api";

/**
 * /app/activity (R5): MY receipts and actions — receipts paid by any of my linked wallets,
 * questions I asked. All real rows filtered to this profile; nothing invented.
 */
export default function ActivityPage() {
  const { profile } = useProfile();
  const [receipts, setReceipts] = React.useState<ReceiptDTO[] | null>(null);
  const [asks, setAsks] = React.useState<RecentAnswerDTO[] | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    let alive = true;
    const wallets = new Set(profile.wallets.map((w) => w.toLowerCase()));
    Promise.all([
      fetch("/api/sluice/receipts", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/sluice/research", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([rc, rs]) => {
        if (!alive) return;
        setReceipts((rc as ReceiptDTO[]).filter((r) => wallets.has(r.payer.toLowerCase())));
        setAsks(
          (rs as (RecentAnswerDTO & { profileId?: string | null })[]).filter((r) => r.profileId === profile.id),
        );
      })
      .catch(() => {
        if (alive) {
          setReceipts([]);
          setAsks([]);
        }
      });
    return () => {
      alive = false;
    };
  }, [profile]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Activity"
        title="My activity"
        description="What you've paid, asked, and earned — receipts from your linked wallets, questions you asked. All of it real."
        actions={profile?.authProvider ? <ProviderBadge provider={profile.authProvider} showLabel /> : undefined}
      />

      {!profile ? (
        <EmptyState
          icon={Activity}
          title="Connect to see your activity"
          description="Connect a wallet (top bar) — your profile collects receipts from every wallet you link, as one person."
        />
      ) : (
        <>
          <Section title="My payments" hint={receipts ? `${receipts.length}` : undefined}>
            {receipts === null ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-4/5" />
              </div>
            ) : receipts.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="No payments yet"
                description="Ask the agent a question or start a stream — your receipts land here."
                action={
                  <Link href="/ask" className="text-sm text-steel hover:underline">
                    Ask the agent →
                  </Link>
                }
              />
            ) : (
              <Card className="divide-y divide-hairline p-0">
                {receipts.slice(0, 12).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusPill status={r.status} />
                      <span className="truncate text-sm text-mid">
                        {r.resourceName ?? r.unitType.replace("per_", "per ")} · {r.units} unit{r.units === 1 ? "" : "s"}
                      </span>
                    </div>
                    <AmountMono value={r.formattedAmount} size="sm" dimDecimals />
                  </div>
                ))}
                <div className="px-5 py-3">
                  <Link href="/app/settlements" className="inline-flex items-center gap-1 text-xs text-steel hover:underline">
                    All settlements <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </Card>
            )}
          </Section>

          <Section title="My questions" hint={asks ? `${asks.length}` : undefined}>
            {asks === null ? (
              <Skeleton className="h-20 w-full" />
            ) : asks.length === 0 ? (
              <EmptyState
                icon={MessageCircleQuestion}
                title="Nothing asked yet"
                description="Questions you ask (while connected) are attributed to your profile."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {asks.slice(0, 8).map((a) => (
                  <Card key={a.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="text-sm text-hi">“{sanitizeExcerpt(a.question, 100)}”</div>
                      <div className="mt-1 text-xs text-low">
                        {a.citationCount} paid citation{a.citationCount === 1 ? "" : "s"} ·{" "}
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Pill tone="settled" dot>
                      {a.formattedTotalPaid}
                    </Pill>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
