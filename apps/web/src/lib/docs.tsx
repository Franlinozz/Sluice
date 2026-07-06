import * as React from "react";
import { Lead, H2, P, UL, LI, Callout, A, InlineCode } from "@/components/docs/prose";
import { CodeBlock } from "@/components/docs/code-block";
import { PartnerForm } from "@/components/docs/partner-form";

export interface DocHeading {
  id: string;
  text: string;
}
export interface DocPage {
  slug: string;
  title: string;
  group: string;
  description: string;
  headings: DocHeading[];
  Body: React.FC;
}

const API = "https://sluiceflow.vercel.app/gw";

export const docPages: DocPage[] = [
  // ── Getting started ──────────────────────────────────────────
  {
    slug: "quickstart",
    title: "Quickstart",
    group: "Getting started",
    description: "Pay your first Sluice resource on Arc in under a minute.",
    headings: [
      { id: "what", text: "What Sluice is" },
      { id: "pay", text: "Pay a resource (SDK)" },
      { id: "earn", text: "Sell a resource" },
      { id: "verify", text: "Verify it" },
    ],
    Body: () => (
      <>
        <Lead>
          Sluice makes the smallest unit of value sellable — a read, a second, a citation, a listen, a
          call — metered and settled on <A href="https://arc.network">Arc</A> in USDC via Circle
          Gateway. Humans and agents pay per use; creators get paid per use.
        </Lead>
        <H2 id="what">What Sluice is</H2>
        <P>
          A settlement layer for the agent-paid web. It wraps any resource behind an{" "}
          <A href="https://x402.org">x402</A> paywall, meters usage in any unit, and settles batched
          nanopayments gas-free through Circle Gateway. The on-chain anchors (deposit, withdrawal,
          royalty splits, reputation bonds) are verifiable on Arcscan.
        </P>
        <H2 id="pay">Pay a resource (SDK)</H2>
        <P>
          Install <InlineCode>@sluice/pay</InlineCode> and make a real nanopayment in ten lines:
        </P>
        <CodeBlock
          lang="ts"
          code={`import { SluicePay } from "@sluice/pay";

const sluice = new SluicePay({ privateKey: process.env.PK as \`0x\${string}\` });

const resources = await sluice.discover();
const r = resources.find((x) => x.unitType === "per_request")!;

const { data, amount } = await sluice.pay(r.id, {
  maxAmount: 0.05,            // per-call ceiling (USDC)
  reason: "ground my answer", // audit trail
});

console.log(\`paid \${amount} USDC for "\${r.name}"\`, data);`}
        />
        <H2 id="earn">Sell a resource</H2>
        <P>Register a priced, x402-protected resource from the API or the Creator Studio:</P>
        <CodeBlock
          lang="bash"
          code={`curl -X POST ${API}/resources -H 'content-type: application/json' -d '{
  "name": "Premium Quote",
  "unitType": "per_request",
  "price": "$0.001",
  "path": "premium-quote"
}'`}
        />
        <H2 id="verify">Verify it</H2>
        <P>
          Every settlement is real. Read receipts from the registry, and inspect the on-chain anchors
          on Arcscan (Gateway Wallet, BondEscrow, ReputationRegistry).
        </P>
        <CodeBlock lang="bash" code={`curl ${API}/receipts | jq '.[0]'`} />
      </>
    ),
  },

  // ── Concepts ─────────────────────────────────────────────────
  {
    slug: "the-meter",
    title: "The Meter & Units",
    group: "Concepts",
    description: "One meter, every unit. Accrual, batching, and honest decimals.",
    headings: [
      { id: "units", text: "Units" },
      { id: "accrual", text: "Accrual & batching" },
      { id: "decimals", text: "Decimals discipline" },
    ],
    Body: () => (
      <>
        <Lead>
          The Meter is unit-agnostic. If it can be counted, it can be priced and paid for — per use.
        </Lead>
        <H2 id="units">Units</H2>
        <P>Built-in unit types, each priced in 6-dp USDC base units:</P>
        <UL>
          <LI>
            <InlineCode>per_request</InlineCode>, <InlineCode>per_read</InlineCode>,{" "}
            <InlineCode>per_crawl</InlineCode> — discrete calls.
          </LI>
          <LI>
            <InlineCode>per_citation</InlineCode> — pay when a source grounds an answer (the citation
            toll).
          </LI>
          <LI>
            <InlineCode>per_second</InlineCode> — streaming/continuous (see Streaming).
          </LI>
          <LI>
            <InlineCode>per_byte</InlineCode>, <InlineCode>per_token</InlineCode>,{" "}
            <InlineCode>per_listen</InlineCode>, <InlineCode>per_view</InlineCode>.
          </LI>
        </UL>
        <H2 id="accrual">Accrual & batching</H2>
        <P>
          A payer signs an x402 authorization against the Gateway Wallet. Usage accrues per unit, and
          the platform batches accruals into a single gas-free settlement through Circle Gateway. A
          reconciler polls Circle until each transfer is confirmed and marks the receipt settled.
        </P>
        <H2 id="decimals">Decimals discipline</H2>
        <Callout title="Never mix decimals" tone="warn">
          Payment USDC is 6-dp and handled as <InlineCode>bigint</InlineCode> base units — never
          floats. Native Arc gas is 18-dp and tracked separately. Sluice never coerces between them.
        </Callout>
      </>
    ),
  },
  {
    slug: "streaming",
    title: "Streaming & Proof-of-Flow",
    group: "Concepts",
    description: "Per-second metering that never charges for dead air.",
    headings: [
      { id: "model", text: "The model" },
      { id: "pof", text: "Proof-of-flow" },
      { id: "settle", text: "Settlement" },
    ],
    Body: () => (
      <>
        <Lead>
          Streaming meters value per second while a heartbeat confirms delivery — and freezes the
          instant delivery stops, so you are never charged for dead air.
        </Lead>
        <H2 id="model">The model</H2>
        <P>
          The payer approves a <strong>rate</strong> and a <strong>reserve</strong> cap. The meter
          accrues lazily: frozen accrued milliseconds plus the live flowing delta, capped at the
          reserve. Pause freezes the charge; resume continues it.
        </P>
        <H2 id="pof">Proof-of-flow</H2>
        <P>
          A lightweight heartbeat proves the stream is being delivered. If the heartbeat goes stale,
          the meter auto-pauses and freezes accrual at the <em>last good heartbeat</em> — not at
          detection time — so no dead-air seconds are billed. When the heartbeat returns, it
          auto-resumes.
        </P>
        <H2 id="settle">Settlement</H2>
        <P>
          On stop, the flowed whole seconds settle via the standard per-second toll — a real Gateway
          receipt. Unused reserve is simply never charged; nothing was escrowed to refund.
        </P>
        <Callout tone="ok">Try it live in the console under Streams → start a session.</Callout>
      </>
    ),
  },
  {
    slug: "citation-toll",
    title: "Citation Toll & Royalty Splits",
    group: "Concepts",
    description: "AI agents pay creators per citation — split on-chain when authored by many.",
    headings: [
      { id: "toll", text: "The citation toll" },
      { id: "splits", text: "Royalty splits" },
    ],
    Body: () => (
      <>
        <Lead>
          When an agent grounds an answer on a source, it pays that source. The payment <em>is</em>{" "}
          the citation — auditable, per use.
        </Lead>
        <H2 id="toll">The citation toll</H2>
        <P>
          The research agent reasons over candidate sources, pays the toll to retrieve each one it
          cites, then synthesizes a grounded answer. Each citation maps to a real settlement, so
          attribution and payment are the same event.
        </P>
        <H2 id="splits">Royalty splits</H2>
        <P>
          Single-author resources settle gas-free via Gateway. Multi-collaborator resources deploy a
          per-resource <InlineCode>RoyaltySplitter</InlineCode> contract: the citation pays the
          splitter, which fans the USDC out by share on-chain (a real Arcscan transaction). The last
          payee absorbs rounding dust so the split is exact.
        </P>
      </>
    ),
  },
  {
    slug: "reputation-bonds",
    title: "Reputation Bonds",
    group: "Concepts",
    description: "Reputation you can read as money — capital at risk, not a star rating.",
    headings: [
      { id: "why", text: "Why bonds" },
      { id: "flow", text: "Post → resolve" },
      { id: "erc8004", text: "ERC-8004" },
    ],
    Body: () => (
      <>
        <Lead>
          A provider stakes real USDC behind a job. Deliver and it&apos;s released; underdeliver and
          the arbiter slashes it to the buyer. Reputation becomes a fact you can read, not a rating
          you have to trust.
        </Lead>
        <H2 id="why">Why bonds</H2>
        <P>
          Star ratings are cheap to fake. Capital at risk is not. The BondEscrow contract tracks each
          provider&apos;s bonded / active / slashed / released totals on-chain — that is the
          reputation.
        </P>
        <H2 id="flow">Post → resolve</H2>
        <UL>
          <LI>
            <strong>postBond</strong> — the provider self-bonds USDC for a match (real transferFrom).
          </LI>
          <LI>
            <strong>release</strong> — successful delivery returns the bond to the provider.
          </LI>
          <LI>
            <strong>slash</strong> — underdelivery sends the bond to the harmed buyer (arbiter only).
          </LI>
        </UL>
        <H2 id="erc8004">ERC-8004</H2>
        <P>
          A minimal ERC-8004 Identity + Reputation registry pairs each provider with an on-chain
          identity and 1–5 feedback recorded on resolution (5★ release, 1★ slash). All three
          contracts are deployed and verified on Arcscan.
        </P>
      </>
    ),
  },

  // ── Build ────────────────────────────────────────────────────
  {
    slug: "sdk",
    title: "sluice-pay SDK",
    group: "Build",
    description: "Pay any Sluice / x402 resource in one call.",
    headings: [
      { id: "install", text: "Install" },
      { id: "pay", text: "Pay" },
      { id: "guards", text: "Budget & reasoning" },
      { id: "deposit", text: "Deposit-aware" },
    ],
    Body: () => (
      <>
        <Lead>
          <InlineCode>@sluice/pay</InlineCode> wraps Circle&apos;s GatewayClient and the Sluice
          registry, with budget + reasoning guards and deposit-aware balance checks.
        </Lead>
        <H2 id="install">Install</H2>
        <CodeBlock lang="bash" code={`pnpm add @sluice/pay`} />
        <H2 id="pay">Pay</H2>
        <CodeBlock
          lang="ts"
          code={`const sluice = new SluicePay({ privateKey });
const { data, amount } = await sluice.pay(resourceId, { maxAmount: 0.01 });`}
        />
        <H2 id="guards">Budget & reasoning</H2>
        <CodeBlock
          lang="ts"
          code={`const sluice = new SluicePay({ privateKey, budget: 0.50 }); // cumulative cap

await sluice.pay(id, {
  maxAmount: 0.01,
  onDecision: ({ formattedPrice }) => confirm(\`pay \${formattedPrice}?\`), // abort by returning false
});`}
        />
        <H2 id="deposit">Deposit-aware</H2>
        <P>
          <InlineCode>pay()</InlineCode> checks your Gateway balance first and fails with an
          actionable error instead of a revert. Use <InlineCode>autoDeposit: true</InlineCode> or
          deposit explicitly with <InlineCode>sluice.deposit(&quot;1.00&quot;)</InlineCode>.
        </P>
      </>
    ),
  },
  {
    slug: "mcp",
    title: "MCP server",
    group: "Build",
    description: "Let Claude Code / Cursor / Codex transact through Sluice natively.",
    headings: [
      { id: "tools", text: "Tools" },
      { id: "run", text: "Run" },
      { id: "wire", text: "Wire into a client" },
    ],
    Body: () => (
      <>
        <Lead>
          The Sluice MCP server exposes Sluice as native tools so any MCP-capable agent can discover
          and pay resources on Arc.
        </Lead>
        <H2 id="tools">Tools</H2>
        <UL>
          <LI>
            <InlineCode>discover_resources</InlineCode>, <InlineCode>get_price</InlineCode>
          </LI>
          <LI>
            <InlineCode>pay_resource</InlineCode> — real nanopayment (needs{" "}
            <InlineCode>SLUICE_PRIVATE_KEY</InlineCode>)
          </LI>
          <LI>
            <InlineCode>get_receipts</InlineCode>, <InlineCode>register_resource</InlineCode>
          </LI>
        </UL>
        <H2 id="run">Run</H2>
        <CodeBlock
          lang="bash"
          code={`SLUICE_API=${API} SLUICE_PRIVATE_KEY=0x... pnpm --filter @sluice/mcp start`}
        />
        <H2 id="wire">Wire into a client</H2>
        <CodeBlock
          lang="json"
          code={`{
  "mcpServers": {
    "sluice": {
      "command": "pnpm",
      "args": ["--filter", "@sluice/mcp", "start"],
      "cwd": "/path/to/Sluice",
      "env": { "SLUICE_API": "${API}", "SLUICE_PRIVATE_KEY": "0x..." }
    }
  }
}`}
        />
      </>
    ),
  },
  {
    slug: "api-reference",
    title: "API reference",
    group: "Build",
    description: "The Sluice registry + settlement HTTP API.",
    headings: [
      { id: "resources", text: "Resources" },
      { id: "pay", text: "Pay & settle" },
      { id: "bonds", text: "Bonds & treasury" },
    ],
    Body: () => (
      <>
        <Lead>
          Base URL <InlineCode>{API}</InlineCode>. All money is 6-dp USDC base-unit strings.
        </Lead>
        <H2 id="resources">Resources</H2>
        <UL>
          <LI>
            <InlineCode>GET /resources</InlineCode> · <InlineCode>GET /resources/:id</InlineCode> —
            list / fetch.
          </LI>
          <LI>
            <InlineCode>POST /resources</InlineCode> — register (name, unitType, price, path).
          </LI>
          <LI>
            <InlineCode>GET|POST /paid/:path</InlineCode> — the x402-protected endpoint (402 →
            pay → 200).
          </LI>
        </UL>
        <H2 id="pay">Pay & settle</H2>
        <UL>
          <LI>
            <InlineCode>GET /receipts</InlineCode>, <InlineCode>GET /kpis</InlineCode>,{" "}
            <InlineCode>GET /gateway/balance</InlineCode>.
          </LI>
          <LI>
            <InlineCode>POST /research</InlineCode> — citation-toll loop.
          </LI>
          <LI>
            <InlineCode>POST /sessions</InlineCode> + <InlineCode>/sessions/:id/&#123;heartbeat,
            pause,resume,stop&#125;</InlineCode> — streaming.
          </LI>
        </UL>
        <H2 id="bonds">Bonds & treasury</H2>
        <UL>
          <LI>
            <InlineCode>GET /contracts</InlineCode>, <InlineCode>GET /reputation</InlineCode>.
          </LI>
          <LI>
            <InlineCode>POST /matches</InlineCode>, <InlineCode>POST /matches/:id/resolve</InlineCode>.
          </LI>
          <LI>
            <InlineCode>GET /treasury/balance</InlineCode>,{" "}
            <InlineCode>POST /treasury/withdraw</InlineCode> (instant Arc / cross-chain).
          </LI>
        </UL>
      </>
    ),
  },
  {
    slug: "connectors",
    title: "Connectors",
    group: "Build",
    description: "Turn existing content into priced, metered resources.",
    headings: [
      { id: "rss", text: "RSS / RSSHub (live)" },
      { id: "peertube", text: "PeerTube (live)" },
      { id: "oss", text: "Navidrome & Owncast (available)" },
    ],
    Body: () => (
      <>
        <Lead>
          Connectors ingest external content and mint priced resources that reuse the Meter and the
          streaming engine. <InlineCode>GET /connectors</InlineCode> returns the catalog with each
          one&apos;s status.
        </Lead>
        <H2 id="rss">RSS / RSSHub (live)</H2>
        <P>Any RSS/Atom feed or RSSHub route → per-citation citable resources.</P>
        <CodeBlock
          lang="bash"
          code={`curl -X POST ${API}/connectors/rss -H 'content-type: application/json' \\
  -d '{"feedUrl":"https://hnrss.org/frontpage"}'`}
        />
        <H2 id="peertube">PeerTube (live)</H2>
        <P>
          Ingest real videos from any public PeerTube instance as <InlineCode>per_second</InlineCode>{" "}
          streaming resources (no keys — PeerTube&apos;s public API is open). They&apos;re then
          meterable with a live streaming session.
        </P>
        <CodeBlock
          lang="bash"
          code={`curl -X POST ${API}/connectors/peertube -H 'content-type: application/json' \\
  -d '{"instance":"https://framatube.org","count":6}'`}
        />
        <H2 id="oss">Navidrome &amp; Owncast (available)</H2>
        <P>
          Navidrome (per-listen music royalties) and Owncast (per-second live streaming) ship as real
          adapters — point them at your own instance. They&apos;re labeled <em>available</em> rather
          than live because they need your server (we don&apos;t fake a running instance).
        </P>
        <CodeBlock
          lang="bash"
          code={`# Owncast — your instance URL
curl -X POST ${API}/connectors/owncast -d '{"instance":"https://live.example.com"}'

# Navidrome — Subsonic credentials
curl -X POST ${API}/connectors/navidrome \\
  -d '{"baseUrl":"https://music.example.com","user":"u","token":"<md5>","salt":"<salt>"}'`}
        />
      </>
    ),
  },

  {
    slug: "partners",
    title: "List your endpoint on the Bazaar",
    group: "Build",
    description: "Cross-team exchange: put your priced endpoint on the Sluice Bazaar — our agents pay it for real.",
    headings: [
      { id: "why", text: "Why list" },
      { id: "form", text: "List your endpoint" },
      { id: "api", text: "Or via the API" },
    ],
    Body: () => (
      <>
        <Lead>
          Building on x402 too? List your priced endpoint on the Sluice Bazaar (with your consent —
          you register it) and Sluice buyer agents can genuinely pay YOUR service on Arc.
          Machine-to-machine traction across teams, all real.
        </Lead>
        <H2 id="why">Why list</H2>
        <UL>
          <LI>Your endpoint appears in the Bazaar and on the public /traction partners strip.</LI>
          <LI>Our budgeted agents include it in real paid sessions — receipts on both sides.</LI>
          <LI>We probe your URL for a real 402 with payment requirements before listing. No dead entries.</LI>
        </UL>
        <H2 id="form">List your endpoint</H2>
        <PartnerForm />
        <H2 id="api">Or via the API</H2>
        <CodeBlock
          lang="bash"
          code={`curl -X POST ${API}/partners/endpoints -H 'content-type: application/json' -d '{
  "name": "Weather oracle · per request",
  "team": "yourteam",
  "endpointUrl": "https://api.yourteam.dev/paid/weather",
  "contact": "@you"
}'`}
        />
        <P>
          Requirements: the URL must answer <InlineCode>402</InlineCode> with x402 payment
          requirements; the Gateway-batched scheme settles gas-free, plain exact-scheme endpoints
          settle per payment. Listings appear at <InlineCode>GET {API}/partners</InlineCode>.
        </P>
      </>
    ),
  },

  // ── Compatibility ────────────────────────────────────────────
  {
    slug: "rsl",
    title: "RSL & llms.txt",
    group: "Compatibility",
    description: "RSL-compatible licensing terms that actually settle.",
    headings: [
      { id: "rsl", text: "RSL 1.0" },
      { id: "llms", text: "llms.txt" },
      { id: "badge", text: "Earned badge" },
    ],
    Body: () => (
      <>
        <Lead>
          Sluice speaks the emerging licensing standards — and unlike a plain policy file, it
          actually collects.
        </Lead>
        <H2 id="rsl">RSL 1.0</H2>
        <P>
          Every resource emits <A href="https://rslstandard.org">RSL</A> licensing terms (per-crawl /
          per-inference price, payTo) at <InlineCode>/resources/:id/rsl</InlineCode>. RSL declares the
          terms; Sluice is the settlement that honors them.
        </P>
        <H2 id="llms">llms.txt</H2>
        <P>
          A machine-readable <InlineCode>/resources/:id/llms.txt</InlineCode> tells agents what a
          resource costs and how to pay it, so discovery and payment are self-describing.
        </P>
        <H2 id="badge">Earned badge</H2>
        <P>
          An embeddable SVG badge at <InlineCode>/badge/:id</InlineCode> shows a resource&apos;s real
          earned total — live, not decorative.
        </P>
      </>
    ),
  },
  {
    slug: "self-hosting",
    title: "Self-hosting the toll sidecar",
    group: "Compatibility",
    description: "Run your own toll booth; keep custody of your earnings.",
    headings: [
      { id: "run", text: "Run the API" },
      { id: "point", text: "Point the SDK at it" },
    ],
    Body: () => (
      <>
        <Lead>
          Sluice is creator-owned. Run the toll sidecar yourself and settle to your own wallet — no
          platform lock-in.
        </Lead>
        <H2 id="run">Run the API</H2>
        <CodeBlock
          lang="bash"
          code={`# in the Sluice monorepo
pnpm --filter @sluice/api start   # serves the registry + /paid/* paywall`}
        />
        <P>
          Configure your seller wallet and Gateway settlement backend via env. SQLite + Drizzle keep
          state local; the reconciler resolves Gateway transfers to settled receipts.
        </P>
        <H2 id="point">Point the SDK / MCP at it</H2>
        <CodeBlock
          lang="ts"
          code={`new SluicePay({ privateKey, apiBase: "https://toll.yoursite.com" });`}
        />
      </>
    ),
  },

  // ── Trust ────────────────────────────────────────────────────
  {
    slug: "changelog",
    title: "Changelog",
    group: "Trust",
    description: "What shipped, when — real dated entries.",
    headings: [{ id: "log", text: "Releases" }],
    Body: () => (
      <>
        <Lead>Every entry is real and dated to when it shipped to Arc testnet + production.</Lead>
        <H2 id="log">Releases</H2>
        <P>
          <strong>2026-07-06 · Overhaul R0–R6.</strong> Zero-defect audit gate (Playwright crawler);
          brand v2 (Michroma wordmark, glacial flow accent, halftone depth); motion system
          (reduced-motion safe, transform/opacity only); the living-logo landing hero drawn from real
          receipts; the comprehension layer (guided tour, first-run checklist, glossary); people &amp;
          traction — profiles (one profile = one human), <A href="/community">/community</A>,{" "}
          <A href="/traction">/traction</A>, partner x402 endpoints with a proven cross-team
          settlement; hand-built architecture diagram, whitepaper v2 (brand typography, linked
          TOC), and the rebuilt README.
        </P>
        <P>
          <strong>2026-06-25 · Phase 8 — Docs &amp; trust artifacts.</strong> This documentation
          site (search, scroll-spy, prev/next), the whitepaper PDF, changelog, and FAQ.
        </P>
        <P>
          <strong>2026-06-25 · Phase 7 — SDK &amp; MCP.</strong> <InlineCode>@sluice/pay</InlineCode>{" "}
          (one-call x402 payments, deposit-aware, budget + reasoning hooks) and the Sluice MCP server
          (discover / price / pay / receipts / register). Verified with real $0.001 nanopayments.
        </P>
        <P>
          <strong>2026-06-24 · Phase 6 — Landing.</strong> Cinematic public landing: canvas meter,
          live real stats, &quot;watch the economy&quot; from real settlements, verify-the-receipt.
        </P>
        <P>
          <strong>2026-06-24 · Phase 5 — Reputation bonds, Bazaar &amp; Treasury.</strong> ERC-8004
          Identity/Reputation + BondEscrow deployed and verified on Arcscan; broker post → slash /
          release; Bazaar; real Treasury withdrawals (instant Arc + cross-chain to Base Sepolia).
        </P>
        <P>
          <strong>2026-06-24 · Phase 4 — Streaming meter.</strong> Per-second metering with
          proof-of-flow auto-pause — no charge for dead air.
        </P>
        <P>
          <strong>2026-06-23 · Phases 1–3 — Meter, agent &amp; citation toll.</strong> The Meter +
          Gateway settlement; the paying agent; the citation toll with on-chain royalty splits; RSS
          connector; RSL / llms.txt / earned badge.
        </P>
        <P>
          <strong>2026-06-23 · Phase 0 — Foundation.</strong> Monorepo, Graphite design system,
          SSR-safe wallet, the console shell.
        </P>
      </>
    ),
  },
  {
    slug: "faq",
    title: "FAQ",
    group: "Trust",
    description: "Plain-English: what's live, what's testnet, how settlement works.",
    headings: [
      { id: "real", text: "Is the data real?" },
      { id: "traction", text: "Is the traction real?" },
      { id: "network", text: "Mainnet or testnet?" },
      { id: "settle", text: "How does settlement work?" },
      { id: "creators", text: "How do creators get paid?" },
      { id: "roadmap", text: "What's beta / roadmap?" },
    ],
    Body: () => (
      <>
        <Lead>Honest answers. No mock data, no vanity numbers.</Lead>
        <H2 id="real">Is the data real?</H2>
        <P>
          Yes. Every figure in the console and on the landing traces to the registry database or the
          chain. Payments are real x402 authorizations settled by Circle Gateway; the latest receipt
          and its Circle transfer ID are shown so anyone can re-check.
        </P>
        <H2 id="traction">Is the traction real?</H2>
        <P>
          Yes, and it is counted conservatively. One profile = one human: wallets linked to the same
          profile are clustered and count as <strong>one</strong> user in every people metric, and we
          never build anything that makes one person look like several. Partner endpoints are probed
          with a real 402 handshake before they may list, so there are no dead entries. You can
          verify all of it yourself: <A href="/traction">/traction</A> and{" "}
          <InlineCode>/api/stats</InlineCode> read the same source, every settlement figure links to
          its receipt, and the on-chain anchors resolve on Arcscan.
        </P>
        <H2 id="network">Mainnet or testnet?</H2>
        <P>
          Sluice runs on <strong>Arc testnet</strong> (chain 5042002) with real test USDC — the flows
          (deposits, x402 signatures, Gateway batches, withdrawals, contracts) are exactly the
          mainnet flows, but the tokens carry no monetary value, so agents and judges can spend
          freely. Settlement is network-agnostic by design (one chain interface, no scattered RPC
          config): when Arc mainnet opens, redeployment is configuration plus contract deploys — not
          a rewrite.
        </P>
        <H2 id="settle">How does settlement work?</H2>
        <P>
          Circle Gateway settles batched nanopayments gas-free via an attested ledger, so each payment
          carries a Circle transfer ID rather than its own gas-burning transaction. Funds touch the
          chain at the deposit and the withdrawal (a Gateway Minter mint), plus royalty splits and
          reputation bonds — all verifiable on Arcscan.
        </P>
        <H2 id="creators">How do creators get paid?</H2>
        <P>
          Per use. A single-author resource is credited gas-free through Gateway; a multi-collaborator
          resource pays an on-chain RoyaltySplitter that fans out by share. Creators withdraw their
          balance any time — instant on Arc, or cross-chain to Base / Arbitrum / Ethereum.
        </P>
        <H2 id="roadmap">What&apos;s beta / roadmap?</H2>
        <UL>
          <LI>Live: meter, agent, citation toll, splits, streaming, bonds, Bazaar, Treasury, SDK, MCP.</LI>
          <LI>Beta: cross-chain withdrawals (require gas on the destination chain).</LI>
          <LI>Roadmap: more connectors, mainnet, wallet-driven self-service deposit/withdraw.</LI>
        </UL>
      </>
    ),
  },
];

export function getDoc(slug: string): DocPage | undefined {
  return docPages.find((d) => d.slug === slug);
}

export function adjacentDocs(slug: string): { prev?: DocPage; next?: DocPage } {
  const i = docPages.findIndex((d) => d.slug === slug);
  if (i === -1) return {};
  return { prev: docPages[i - 1], next: docPages[i + 1] };
}

export const docGroups = Array.from(new Set(docPages.map((d) => d.group)));
