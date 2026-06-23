import { Landmark } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";

export const metadata = { title: "Treasury" };

export default function TreasuryPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Treasury"
        title="Treasury"
        description="Your unified USDC balance in the Gateway, USDC/EURC holdings, and cross-chain withdrawal via App Kit (Bridge / Swap / Unified Balance)."
      />
      <EmptyState
        icon={Landmark}
        title="Nothing to settle yet"
        description="Your Gateway balance appears once payments settle on Arc. From here you'll withdraw cross-chain in USDC or EURC. Balances are always read live from chain — never mocked."
      />
    </div>
  );
}
