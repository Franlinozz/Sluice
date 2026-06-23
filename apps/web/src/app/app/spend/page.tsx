import { Bot } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";

export const metadata = { title: "Spend · Agent Console" };

export default function SpendPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Spend · Agent Console"
        title="Agent Console"
        description="Run budget-bound buyer agents that reason per resource — is this source worth the price for my task? — pay via x402, and show a full reasoning trace with ROI."
      />
      <EmptyState
        icon={Bot}
        title="No agents yet"
        description="The buyer agent runtime arrives in the Agent phase: real LLM reasoning, a hard USD budget, real x402 payments, and a visible decision trace. Without an OpenAI key it runs in deterministic mock mode."
      />
    </div>
  );
}
