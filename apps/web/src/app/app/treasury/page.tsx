import { AlertTriangle, Landmark } from "lucide-react";
import { AddressChip, AmountMono, Card, CountUp, DataRow, StatusPill } from "@sluice/ui";
import { explorerAddressUrl } from "@sluice/chain";
import { sluiceApi } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { Term } from "@/components/glossary";
import { AutoRefresh } from "@/components/auto-refresh";
import { WithdrawPanel } from "@/components/treasury/withdraw-panel";
import { EditorialMedia } from "@/components/media/editorial-media";

export const metadata = { title: "Treasury" };
export const dynamic = "force-dynamic";

export default async function TreasuryPage() {
  const [bal, chains] = await Promise.all([sluiceApi.treasuryBalance(), sluiceApi.treasuryChains()]);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={20000} />
      <PageHeader
        eyebrow="Treasury"
        title="Treasury"
        description={
          <>
            Your balance, and real withdrawals to your own wallet — instantly on Arc, or out to
            other chains. Tiny payments arrive here via <Term k="batch-settlement">batch settlement</Term>.
          </>
        }
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
            <div className="font-mono text-3xl tracking-tight tnum text-hi">
              <CountUp value={Number(bal.gateway.available) / 1e6} prefix="$" decimals={6} />
            </div>
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
          <Card className="mb-4 grid grid-cols-1 overflow-hidden p-0 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
            <EditorialMedia
              src="/media/editorial/app/treasury/treasury-withdrawal-wallet.webp"
              alt="A lockbox, a release slip and a leather wallet — funds leaving custody"
              variant="split"
              darkOpacity={0.72}
              lightOpacity={0.92}
              objectPosition="center 55%"
              sizes="(max-width: 768px) 100vw, 300px"
              className="min-h-36"
            />
            <div className="flex flex-col justify-center gap-1.5 p-5">
              <div className="font-display text-sm font-medium text-hi">Your earnings, out of the box.</div>
              <p className="text-xs leading-relaxed text-mid">
                Withdrawing materializes your Gateway balance on-chain via the Gateway Minter — an
                instant mint on Arc, or cross-chain to another testnet. The balance figures on this
                page are always read live from Gateway, never from an image.
              </p>
              <p className="text-xs leading-relaxed text-low">
                Note: this is the shared platform treasury (testnet funds), deliberately left open
                during the hackathon so judges can perform a real withdrawal end-to-end. After the
                hackathon it locks to the operator wallet.
              </p>
            </div>
          </Card>
          <WithdrawPanel available={bal.gateway.formattedAvailable} chains={chains ?? []} />
        </Section>
      )}

      <Section title="On-chain anchors">
        <Card className="p-5">
          <p className="text-sm leading-relaxed text-mid">
            Circle Gateway settles nanopayments gas-free via an attested ledger. Funds touch the chain
            at two points, both verifiable on Arcscan: the buyer&apos;s <strong>deposit</strong>
            {" "}into the Gateway Wallet, and the seller&apos;s <strong>withdrawal</strong>
            {" "}— a real Gateway Minter mint to the recipient. Same-chain withdrawals are an
            instant Arc mint; cross-chain
            burns gas-free on Circle&apos;s ledger, then mints on the target chain (which needs gas there).
          </p>
        </Card>
      </Section>
    </div>
  );
}
