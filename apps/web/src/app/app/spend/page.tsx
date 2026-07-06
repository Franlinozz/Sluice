import { AlertTriangle, Bot } from "lucide-react";
import { Card } from "@sluice/ui";
import { sluiceApi, type AgentDTO } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { CreateAgentForm } from "@/components/spend/create-agent-form";
import { SessionCard } from "@/components/spend/session-card";
import { EditorialMedia } from "@/components/media/editorial-media";
import { Term } from "@/components/glossary";

export const metadata = { title: "Spend · Agent Console" };
export const dynamic = "force-dynamic";

export default async function SpendPage() {
  const list = await sluiceApi.agents();
  // fetch each agent's detail (includes latest run + decisions trace)
  const agents = list
    ? await Promise.all(list.map((a) => sluiceApi.agent(a.id)))
    : null;

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <PageHeader
        eyebrow="Spend · Agent Console"
        title="Agent Console"
        description={
          <>
            Run an AI agent with a spending budget. It decides what&apos;s worth paying for — paying
            per use via <Term k="x402">x402</Term> — and shows its full reasoning: every payment,
            skip, and cap.
          </>
        }
      />

      <CreateAgentForm />

      <Card className="grid grid-cols-1 overflow-hidden p-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col justify-center gap-2 p-6">
          <div className="font-display text-base font-medium text-hi">Budget in, judgment shown.</div>
          <p className="text-sm leading-relaxed text-mid">
            Set a budget and a plain-English policy. The agent evaluates what&apos;s on offer, pays for
            what&apos;s useful, skips the rest — and every decision below shows its reasoning. The model
            recommends; deterministic code enforces the money rules.
          </p>
        </div>
        <EditorialMedia
          src="/media/editorial/app/spend/agent-budget-operations.webp"
          alt="Printed resource cards stamped approved, skipped and selected, beside handwritten budget notes"
          variant="split"
          gradient="to-r"
          darkOpacity={0.62}
          lightOpacity={0.85}
          objectPosition="center 30%"
          sizes="(max-width: 768px) 100vw, 40vw"
          className="min-h-44"
        />
      </Card>

      <Section title="Your agents" hint={agents ? `${agents.length}` : undefined}>
        {agents === null ? (
          <EmptyState
            icon={AlertTriangle}
            title="API unreachable"
            description="The agent API isn't responding. Start it with pnpm dev:api (or check the VPS service)."
          />
        ) : agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Create a buyer agent above, then run a session to watch it reason, pay, and skip — live."
          />
        ) : (
          <div className="flex flex-col gap-4" data-tour="spend">
            {agents.filter((a): a is AgentDTO => Boolean(a)).map((a, i) => (
              <SessionCard key={a.id} agent={a} defaultOpen={i === 0} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
