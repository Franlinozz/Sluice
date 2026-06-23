import { Coins } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shell/page-parts";

export const metadata = { title: "Earn · Creator Studio" };

export default function EarnPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Earn · Creator Studio"
        title="Creator Studio"
        description="Register a resource — an article, feed, stream, endpoint, or API — set a unit and price, and get a live x402-protected endpoint. Add attribution splits, then withdraw cross-chain."
      />
      <EmptyState
        icon={Coins}
        title="No resources yet"
        description="Resource registration and the live Meter arrive in the Meter phase. You'll price per read, second, citation, listen, view, or call — and get paid per use, settled on Arc in USDC."
      />
    </div>
  );
}
