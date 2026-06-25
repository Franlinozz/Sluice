# Sluice — progress & state (compact anchor)

> Durable session state so context can be re-derived cheaply. Canonical rules/constants live in
> **CLAUDE.md** (read it first). This file = what's done + how it's wired + what's next.

## Live
- Web (Vercel): **https://sluice-six.vercel.app** — auto-deploys on push to `main`.
- API (VPS, pm2 `sluice-api`): public at **http://62.171.182.75:3001**, gateway backend, SQLite/Drizzle.
- Vercel env `API_URL` / `NEXT_PUBLIC_API_URL` = the VPS API; web fetches it **server-side** (SC +
  server actions) to avoid https→http mixed content. `pm2 restart sluice-api` to reload.
- Other pm2 apps on the VPS (archon-web:3000, tessera-*) are OTHER projects — never touch.

## Done
- **Phase 0**: monorepo (pnpm), Graphite design system (@sluice/ui, self-hosted fonts, no hex),
  SSR-safe Reown/wagmi wallet, /app shell, /app/_dev/tokens. Next 16 · React 19 · Tailwind v4 ·
  wagmi 3 · viem 2.53.
- **Phase 1**: `apps/api` registry + `withGateway` paywall (402→verify→accrue→200) + THE METER
  (unit adapters, accrual, deferred batch settle) + SettlementBackend (gateway/direct, config) +
  reconciler + receipts + KPIs + gateway balance. Proven on Arc testnet with real USDC: deposit
  (on-chain) → pay → batch settle (gas-free Gateway) → seller credited → withdrawal mint tx
  (real, e.g. `0xfdab0493…`). UI: Settlements Explorer, Overview KPIs, Creator Studio, Treasury.
- **Phase 2**: `apps/api/src/agent` (gpt-4o-mini + deterministic mock) reasons per resource,
  ENFORCES budget/ceiling/units deterministically (model never authorizes), pays via GatewayClient,
  persists trace. `apps/agent` CLI runtime. /app/spend Agent Console (live trace, budget bar).
  Proven: pays relevant, skips off-topic, caps over-ceiling, budget PAUSE, mock works, payments →
  Settlements.

## Key facts
- Funded wallet (buyer): `0xBd88eAE165F8A00B1B33357Fb0880CD4fE5C5E70` (~$119 test USDC left).
- Seller (Phase 1/2 demo): `0x303c819cbb4d7481721e5310E2b120C2a2cdfC58`.
- Arc USDC token `0x3600…0000` (6dp payments / 18dp native gas); Gateway Wallet
  `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`; Gateway Minter
  `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B`; domain 26; chain 5042002.
- **Gateway settles gas-free via attested ledger — NO per-payment on-chain tx**; on-chain anchors
  are deposit + withdrawal. EIP-3009 batched auth needs LONG validity (30d).
- Secrets: `/root/.sluice-secrets/sluice.env` + gitignored `/root/Sluice/.env.local`
  (wallet keys, Reown id, Vercel token, OpenAI key). Vercel root dir = `apps/web`, framework nextjs.
- Reusable scripts: `apps/api/scripts/{buyer,withdraw,watch-transfers,find-settlement-tx,check-wallet,test-mock}.ts`.

- **Phase 3** (the hero): citation toll + RSS connector + on-chain royalty splits. AI agents pay
  creators PER CITATION on Arc. `RoyaltySplitter.sol` (Foundry) deployed per multi-collaborator
  resource; single-author citations gas-free via Gateway, multi via on-chain splitter (real
  Arcscan tx, fans out by share). RSS/Atom ingester (`POST /connectors/rss`). Citation-toll loop
  (`POST /research`): agent pays the toll to retrieve each grounded source (payment == citation ==
  auditable). RSL + llms.txt generators + embeddable SVG badge with REAL earned counter. Public
  `/ask` surface; Creator Studio (RSS ingest, citable sources, badge/RSL/llms.txt, splitter link);
  `/badge/[id]` https proxy. Migration 0003 (resources +contentUrl/splits/sourceType/splitter;
  feeds; research; citations). Units +per_read/per_crawl. Verified live: 2-source answer with real
  Gateway + on-chain-split settlements; 70/30 split on-chain.

## P3 facts
- Citation settlement: single-author → Gateway (gas-free); multi-collaborator → on-chain
  RoyaltySplitter (transfer USDC to splitter + distribute(); buyer wallet relays, pays gas).
- Contract ABI+bytecode committed at apps/api/src/contracts/royalty-splitter.ts (from forge build).
  Deploy/split helpers: apps/api/src/contracts/splitter.ts. Test: scripts/test-split.ts.
- Research loop: apps/api/src/agent/research.ts (reason → pay-to-retrieve → synthesize, cap
  RESEARCH_MAX_CITATIONS=4). Endpoints: /research, /connectors/rss, /resources/:id/{rsl,llms.txt,earned}, /badge/:id.
- API_PUBLIC_URL (for RSL/llms.txt/badge links) defaults to http://62.171.182.75:3001.

- **Phase 4** (streaming meter + proof-of-flow): per-second accrual with reserve cap; heartbeat
  loss auto-pauses (freezes at last heartbeat → no dead-air charge), heartbeat return auto-resumes;
  manual pause/resume/stop; stop settles flowed whole seconds via the Gateway per_second toll (real).
  apps/api/src/meter/streaming.ts; sessions migration 0004; 1s reaper, 4s heartbeat timeout. Fastify
  tolerates empty JSON bodies. Live Meter /app/meter + /app/meter/[id] (real ticking + smooth
  interpolation, controls, simulate-flow-loss) via same-origin /api/sluice/[...] proxy. Verified on
  Arc: accrue→pause→resume→auto-pause(no dead air)→stop→$0.0007 settle.

- **Phase 5** (reputation bonds + Bazaar + Treasury): "reputation = capital at risk."
  - Contracts (Foundry, deployed + VERIFIED on Arcscan, chain 5042002):
    IdentityRegistry `0x8e856716d653db35eb4dac7616648172cebeba34`,
    ReputationRegistry `0x6593cd1eb1dec37797aee650d48ad2f4d910cbd4`,
    BondEscrow `0x1bf29623c8a74c13bc4e27bbe72037a24976c0c1` (arbiter = buyer/operator).
    ABI+bytecode in apps/api/src/contracts/{identity,reputation,bond-escrow}.ts; addresses in deployed.json.
    Deploy: scripts/deploy-registries.ts. Verify: forge verify-contract --verifier blockscout
    --verifier-url https://testnet.arcscan.app/api/ (Arcscan IS Blockscout).
  - Broker (apps/api/src/agent/broker.ts) + drivers (contracts/escrow.ts): provider SELF-bonds
    (broker=provider=seller, beneficiary=buyer/arbiter). createMatch → ensure ERC-8004 identity +
    capitalize seller if short + approve + postBond. resolveMatch → arbiter slash(→buyer)/release(→provider)
    + ERC-8004 feedback (1★ slash / 5★ release). Migration 0005 (matches). Endpoints: /contracts,
    /reputation, /matches[/:id][/resolve], /treasury/{chains,withdraw}.
  - UI: /app/discover Bazaar (registry strip, provider reputation glance, searchable resource grid
    with real per-type actions, BrokerForm), /app/agents Fleet&Reputation (reputation summary + bond
    ledger + Release/Slash). Treasury: real balance + WithdrawPanel.
  - Treasury (apps/api/src/treasury/withdraw.ts): treasury account = OPERATOR (buyer 0xBd88…) — holds
    the unified Gateway balance AND submits the destination mint (so it needs dest gas). GET
    /treasury/balance shows it. Same-chain Arc = REAL instant mint (tx 0x78bfcc…). Cross-chain = burn
    gas-free on Circle ledger then gatewayMint on dest; PRE-FLIGHTS dest gas + refuses before burning.
    PROVEN cross-chain: Arc → Base Sepolia mint tx 0xa6e27ea6… (status success, block 43283562,
    Gateway Minter 0x0022222abe…). Operator funded with Base+Eth Sepolia gas (Arbitrum still 0).
  - Verified end-to-end on Arc: post $0.02 bond → slash (buyer +$0.02, 1★) → release (5★) →
    reputation 2 matches/1 slash/50% reliability; real same-chain + cross-chain withdrawals.

- **Phase 6** (cinematic landing): public `/` rebuilt. Hero (thesis "Make the smallest unit
  sellable…" + canvas HeroMeter particles→gate→settled, reduced-motion frame; CTAs Start earning
  →/app/earn, Run a paying agent →/app/spend; real settled total from KPIs). LiveStats strip
  (components/marketing/live-stats.tsx — polls /api/sluice/kpis every 60s, count-up, reduced-motion):
  settled/units/settlements/resources/payers/creatorsPaid (added creatorsPaid to meter aggregate =
  distinct payTo among settled receipts). One-meter-every-unit line-art. Citation toll = real AskBox
  embedded. EconomyViz (components/marketing/economy-viz.tsx — canvas agents→creators from REAL
  settled receipts, pulses=settlements, 30s refresh, reduced-motion static). VerifyReceipt
  (components/marketing/verify-receipt.tsx — latest real receipt + Circle transfer ID + Arcscan
  anchors: Gateway Wallet/BondEscrow/ReputationRegistry). How-it-works + 3-col footer + Arc Live
  badge. Verified live: real Circle ref 40fe682d…, hero $0.050037, all CTAs route, no fakes.

- **Phase 7** (SDK + MCP): `@sluice/pay` (packages/sluice-pay) — one-call x402 payment of a Sluice
  resource, deposit-aware, budget+reason hooks; discover/getPrice/balance/deposit/pay/receipts.
  NOTE: GatewayClient.pay() returns `amount` as bigint atomic + `formattedAmount` string. Verified:
  examples/pay.ts real $0.001. `@sluice/mcp` (apps/mcp) — stdio MCP server, tools discover_resources/
  get_price/pay_resource/get_receipts/register_resource; needs SLUICE_PRIVATE_KEY for pay. Verified
  via scripts/smoke.mts (MCP client → discover→pay→receipt, real $0.001). READMEs added. tsconfig.base
  path `@sluice/pay`; mcp tsconfig has NO rootDir (path-mapped sources live outside).

- **Phase 8** (docs + trust): bespoke Graphite docs (NOT Fumadocs — chosen for cohesion + Next16/
  Tailwind4 reliability) at /docs/[[...slug]]: sidebar, ⌘K search, scroll-spy TOC, prev/next, reading
  progress. Content in lib/docs.tsx (Quickstart, Concepts×4, Build×4, Compatibility×2, Trust×2).
  Components in components/docs/. Whitepaper PDF via pdfkit (scripts/generate-whitepaper.mjs →
  apps/web/public/sluice-whitepaper.pdf, 8pp, real 2026 facts only). CHANGELOG.md + in-docs changelog
  + FAQ. All live + verified.

- **Phase 9** (QA + submission): Security — no secrets in client bundle (verified; only NEXT_PUBLIC_),
  @fastify/rate-limit added (240/min global, 20/min on /research,/matches,/matches/:id/resolve,
  /treasury/withdraw; RATE_LIMIT_MAX=0 disables). E2E verified live on Arc: all 14 web routes 200;
  streaming start→heartbeat→stop settled 3s/$0.0003 paid; reputation/treasury/receipts/contracts real.
  SUBMISSION.md (live link, repo, demo script <3min, no-dead-controls checklist, real tx artifacts,
  honesty section). CHANGELOG.md. Tagged v1.0.0.
  CAVEATS (need user/browser): Lighthouse (no headless Chrome here); filing the hackathon form.

- **Phase 10** (stretch — quadratic funding): FundingPool.sol (deployed+verified Arcscan
  `0xf7ef1d456e74736bbf346c29f74e28c60ce3ade8`): fund() + distribute(round,creators[],amounts[])
  single-tx sweep. funding/quadratic.ts (match=(Σ√(wc))²−Σc, α-scaled, integer isqrt). funding/pool.ts
  (real on-chain tips, sybil weight via ERC-8004 identity/nonce — honest heuristic, ROUND BUDGET
  committed then pool funded at settle). Migration 0006 (funding_tips, funding_rounds). Endpoints
  /funding[/tip][/settle]. UI /app/funding + nav. Verified: 3×$0.01 backers matched $0.0339 vs
  1×$0.03 matched $0.00 (breadth>size); sweep 0xa97deb20…. deployed.json now has fundingPool.

## STATUS: Phases 0-10 done + live on Arc (tag v1.0.0). Phase 11 (stretch, OSS connectors) IN PROGRESS.
