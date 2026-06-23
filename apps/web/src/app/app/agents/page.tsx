import { Cpu } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";

export const metadata = { title: "Agents · Fleet & Reputation" };

export default function AgentsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Agents · Fleet & Reputation"
        title="Fleet & Reputation"
        description="Your agents, their wallets, and their ERC-8004 reputation bonds — staked, slashed, with full history. Reputation here is capital at risk, not a self-reported score."
      />
      <EmptyState
        icon={Cpu}
        title="No agents in the fleet"
        description="The broker/router agent posts a USDC bond behind each match; underdelivery slashes it on resolve. Registry and bonds deploy in the Reputation phase."
      />
    </div>
  );
}
