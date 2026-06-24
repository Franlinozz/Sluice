import { AlertTriangle, Bot } from "lucide-react";
import {
  AgentTrace,
  AmountMono,
  Badge,
  Card,
  Pill,
  StatusPill,
  type TraceKind,
  cn,
} from "@sluice/ui";
import { sluiceApi, type AgentDTO, type DecisionDTO } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { CreateAgentForm } from "@/components/spend/create-agent-form";
import { RunButton } from "@/components/spend/run-button";

export const metadata = { title: "Spend · Agent Console" };
export const dynamic = "force-dynamic";

const KIND: Record<DecisionDTO["decision"], TraceKind> = {
  pay: "pay",
  skip: "skip",
  capped: "decision",
};

function RunStatusPill({ status }: { status: string }) {
  if (status === "completed") return <StatusPill status="settled" withDot />;
  if (status === "paused") return <StatusPill status="batching" withDot />;
  if (status === "failed") return <StatusPill status="failed" withDot />;
  return <Pill tone="info" dot>running</Pill>;
}

function AgentCard({ agent }: { agent: AgentDTO }) {
  const run = agent.latestRun;
  const budget = Number(agent.budget);
  const spent = run ? Number(run.spent) : 0;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const trace =
    run?.decisions?.map((d) => ({
      kind: KIND[d.decision],
      title: `${d.decision === "capped" ? "Capped" : d.decision === "pay" ? "Paid" : "Skipped"} · ${d.resourceName}`,
      detail: `${d.reason} (relevance ${d.relevance}/100)`,
      amount: d.paid ? (d.formattedAmount ?? undefined) : undefined,
    })) ?? [];

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-medium text-hi">{agent.name}</span>
            {run && (
              <Badge variant={run.mode === "live" ? "signal" : "neutral"}>{run.mode}</Badge>
            )}
          </div>
          <p className="mt-1 max-w-xl text-sm text-mid">{agent.task}</p>
        </div>
        <RunButton agentId={agent.id} />
      </div>

      {/* policy → parsed rules */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="eyebrow">policy</span>
        {agent.rules.formattedPriceCeiling && (
          <Badge variant="outline">ceiling {agent.rules.formattedPriceCeiling}</Badge>
        )}
        <Badge variant="outline">≥{agent.rules.relevanceThreshold} relevance</Badge>
        {agent.rules.topics.slice(0, 5).map((t) => (
          <Badge key={t} variant="neutral">
            {t}
          </Badge>
        ))}
      </div>

      {/* budget bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-low">
            spent <span className="font-mono text-mid">{run?.formattedSpent ?? "$0.00"}</span> /{" "}
            {agent.formattedBudget}
          </span>
          {run && (
            <span className="text-low">
              {run.paidCount ?? 0}/{run.steps} paid · value {run.value}
              {run.avgRelevance != null ? ` · avg rel ${run.avgRelevance}` : ""}
            </span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn("h-full rounded-full transition-[width]", pct >= 100 ? "bg-pending" : "bg-steel")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* latest run + reasoning trace */}
      {run ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <RunStatusPill status={run.status} />
            {run.note && <span className="text-xs text-low">{run.note}</span>}
          </div>
          {trace.length > 0 ? (
            <AgentTrace steps={trace} />
          ) : (
            <p className="text-sm text-low">No decisions recorded.</p>
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-low">No runs yet — press “Run session”.</p>
      )}
    </Card>
  );
}

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
        description="Budget-bound buyer agents that reason per resource — is this source worth paying to cite? — pay via x402, and show a full decision trace with ROI. Genuine decisions, not automation."
      />

      <CreateAgentForm />

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
          <div className="flex flex-col gap-4">
            {agents.filter((a): a is AgentDTO => Boolean(a)).map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
