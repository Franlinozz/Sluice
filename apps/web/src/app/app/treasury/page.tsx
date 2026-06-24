import { AlertTriangle, Landmark } from "lucide-react";
import { AddressChip, AmountMono, Card, DataRow, StatusPill } from "@sluice/ui";
import { explorerAddressUrl } from "@sluice/chain";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { WithdrawPanel } from "@/components/treasury/withdraw-panel";

export const metadata = { title: "Treasury" };
export const dynamic = "force-dynamic";

export default async function TreasuryPage() {
  const [bal, chains] = await Promise.all([sluiceApi.gatewayBalance(), sluiceApi.treasuryChains()]);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={20000} />
      <PageHeader
        eyebrow="Treasury"
        title="Treasury"
        description="Your unified USDC balance in the Gateway with honest states — total, available, withdrawing, withdrawable. Withdrawals mint USDC on-chain (Arcscan-linkable)."
      />

      {bal === null ? (
        <EmptyState
          icon={AlertTriangle}
          title="API unreachable"
          description="The balance API isn't responding. Start it with pnpm dev:api (or check the VPS service)."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-1">
            <div className="eyebrow mb-2">Gateway available</div>
            <AmountMono value={`$${bal.gateway.formattedAvailable}`} size="2xl" dimDecimals />
            <div className="mt-4 flex items-center gap-2">
              <StatusPill status="settled" withDot />
              <span className="text-xs text-low">earnings ready to withdraw</span>
            </div>
            <div className="mt-4">
              <AddressChip address={bal.address} href={explorerAddressUrl(bal.address)} chars={5} />
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <div className="eyebrow mb-3">Balances</div>
            <DataRow label="Wallet USDC (on-chain)" mono>
              ${bal.wallet.formatted}
            </DataRow>
            <DataRow label="Gateway total" mono>
              ${bal.gateway.formattedTotal}
            </DataRow>
            <DataRow label="Available" mono>
              ${bal.gateway.formattedAvailable}
            </DataRow>
            <DataRow label="Withdrawing" mono>
              ${bal.gateway.formattedWithdrawing}
            </DataRow>
            <DataRow label="Withdrawable" mono>
              ${bal.gateway.formattedWithdrawable}
            </DataRow>
          </Card>
        </div>
      )}

      {bal && (
        <Section title="Withdraw" hint="Gateway Minter · instant Arc / cross-chain">
          <WithdrawPanel available={bal.gateway.formattedAvailable} chains={chains ?? []} />
        </Section>
      )}

      <Section title="On-chain anchors">
        <Card className="p-5">
          <p className="text-sm leading-relaxed text-mid">
            Circle Gateway settles nanopayments gas-free via an attested ledger. Funds touch the chain
            at two points, both verifiable on Arcscan: the buyer&apos;s <strong>deposit</strong> into
            the Gateway Wallet, and the seller&apos;s <strong>withdrawal</strong> — a real Gateway
            Minter mint to the recipient. Same-chain withdrawals are an instant Arc mint; cross-chain
            burns gas-free on Circle&apos;s ledger, then mints on the target chain (which needs gas there).
          </p>
        </Card>
      </Section>
    </div>
  );
}
