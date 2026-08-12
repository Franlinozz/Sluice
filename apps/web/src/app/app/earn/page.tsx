import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Coins } from "lucide-react";
import { AddressChip, AmountMono, Badge, Card } from "@sluice/ui";
import { explorerAddressUrl } from "@sluice/chain";
import { sluiceApi, type ResourceDTO } from "@/lib/api";
import { PageHeader, EmptyState, Section } from "@/components/shell/page-parts";
import { AutoRefresh } from "@/components/auto-refresh";
import { RegisterForm } from "@/components/earn/register-form";
import { EditorialMedia } from "@/components/media/editorial-media";
import { RssForm } from "@/components/earn/rss-form";
import { sanitizeLabel } from "@/lib/sanitize";

export const metadata = { title: "Earn · Creator Studio" };
export const dynamic = "force-dynamic";

const CITE_UNITS = new Set(["per_citation", "per_read", "per_crawl"]);
const CITE_PAGE_SIZE = 12;

function CitableCard({ r }: { r: ResourceDTO }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-sm font-medium text-hi">{sanitizeLabel(r.name)}</div>
          <div className="mt-0.5 text-xs text-low">
            {r.author ? `by ${sanitizeLabel(r.author, 60)} · ` : ""}
            {r.rateLabel}
          </div>
        </div>
        <div className="text-right">
          <AmountMono value={r.formattedEarned ?? "$0.00"} size="sm" tone="settled" dimDecimals />
          <div className="text-[11px] text-low">earned</div>
        </div>
      </div>

      {/* live badge (embeddable) */}
      <div className="mt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badge/${r.id}`} alt="Pay-per-cite badge" width={268} height={46} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {r.splitterAddress ? (
          <a
            href={r.splitterUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-steel hover:underline"
          >
            <Badge variant="signal">split</Badge> splitter contract <ArrowUpRight className="size-3" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-low">
            pays <AddressChip address={r.payTo} href={explorerAddressUrl(r.payTo)} chars={3} />
          </span>
        )}
        {r.rslUrl && (
          <a href={r.rslUrl} target="_blank" rel="noreferrer" className="text-steel hover:underline">
            RSL
          </a>
        )}
        {r.llmsTxtUrl && (
          <a href={r.llmsTxtUrl} target="_blank" rel="noreferrer" className="text-steel hover:underline">
            llms.txt
          </a>
        )}
      </div>

      <div className="mt-3 rounded-md border border-hairline bg-terminal p-2.5">
        <code className="block break-all font-mono text-[11px] text-mid">
          {`<img src="https://sluiceflow.vercel.app/badge/${r.id}" alt="Pay-per-cite"/>`}
        </code>
      </div>
    </Card>
  );
}

export default async function EarnPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resources = await sluiceApi.resources();
  const citableAll = (resources ?? []).filter((r) => CITE_UNITS.has(r.unitType));
  const others = (resources ?? []).filter((r) => !CITE_UNITS.has(r.unitType));
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const pageCount = Math.max(1, Math.ceil(citableAll.length / CITE_PAGE_SIZE));
  const page = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount);
  const citable = citableAll.slice((page - 1) * CITE_PAGE_SIZE, page * CITE_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={20000} />
      <PageHeader
        eyebrow="Earn · Creator Studio"
        title="Creator Studio"
        description="Put a price on your work — an article, a feed, a stream — and get paid every time it's used. AI agents pay you per citation, settled on Arc."
      />

      <Card className="grid grid-cols-1 overflow-hidden p-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <EditorialMedia
          src="/media/editorial/app/earn/creator-studio-workspace.webp"
          alt="A creator's desk — microphone, camera, manuscript and notebook"
          variant="split"
          gradient="to-l"
          darkOpacity={0.7}
          lightOpacity={0.9}
          sizes="(max-width: 768px) 100vw, 40vw"
          className="min-h-44"
        />
        <div className="flex flex-col justify-center gap-2 p-6">
          <div className="font-display text-base font-medium text-hi">Real work becomes a priced resource.</div>
          <p className="text-sm leading-relaxed text-mid">
            An essay, a feed, a recording, an endpoint — ingest or register it below, set a unit and a
            price, and every future use settles to your wallet. You get a toll endpoint, an RSL file,
            and a live earned badge.
          </p>
        </div>
      </Card>

      <RssForm />
      <RegisterForm />

      <Card className="grid grid-cols-1 overflow-hidden p-0 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <EditorialMedia
          src="/media/editorial/app/earn/royalty-split-routing.webp"
          alt="One master cable splitting into six labeled collaborator connectors — songwriter, producer, vocalist, guitarist, mix engineer, publisher"
          variant="split"
          darkOpacity={0.88}
          lightOpacity={1}
          sizes="(max-width: 768px) 100vw, 260px"
          className="min-h-40"
        />
        <div className="flex flex-col justify-center gap-2 p-6">
          <div className="font-display text-base font-medium text-hi">Collaborators? One payment, split on-chain.</div>
          <p className="text-sm leading-relaxed text-mid">
            A resource with multiple authors gets its own RoyaltySplitter contract on Arc: each
            citation payment fans out by share, exactly, in one transaction — look for the{" "}
            <span className="font-mono text-xs">split</span> badge on resources below.
          </p>
        </div>
      </Card>

      <Section
        title="Citable sources"
        hint={
          citableAll.length > CITE_PAGE_SIZE
            ? `${citableAll.length} · page ${page} of ${pageCount}`
            : `${citableAll.length}`
        }
      >
        {resources === null ? (
          <EmptyState
            icon={AlertTriangle}
            title="API unreachable"
            description="The registry API isn't responding."
          />
        ) : citable.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No citable sources yet"
            description="Ingest a feed or register a per-citation resource above to get a toll endpoint, RSL file, and badge."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {citable.map((r) => (
              <CitableCard key={r.id} r={r} />
            ))}
          </div>
        )}
        {citableAll.length > CITE_PAGE_SIZE && (
          <nav className="mt-4 flex items-center justify-between border-t border-hairline pt-4" aria-label="Citable sources pages">
            {page > 1 ? (
              <Link
                href={`/app/earn?page=${page - 1}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-surface-1 px-3 py-2 text-xs text-mid transition-colors hover:border-steel hover:text-hi"
              >
                <ArrowLeft className="size-3.5" /> Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="font-mono text-xs text-low">
              {(page - 1) * CITE_PAGE_SIZE + 1}–{Math.min(page * CITE_PAGE_SIZE, citableAll.length)} of{" "}
              {citableAll.length}
            </span>
            {page < pageCount ? (
              <Link
                href={`/app/earn?page=${page + 1}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-surface-1 px-3 py-2 text-xs text-mid transition-colors hover:border-steel hover:text-hi"
              >
                Next <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </Section>

      {others.length > 0 && (
        <Section title="Other resources" hint={`${others.length}`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {others.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-display text-sm font-medium text-hi">{sanitizeLabel(r.name)}</div>
                  <span className="rounded-md border border-edge bg-surface-2 px-2 py-0.5 font-mono text-xs text-mid">
                    {r.rateLabel}
                  </span>
                </div>
                <div className="mt-2 font-mono text-xs text-low">{r.endpoint}</div>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
