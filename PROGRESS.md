# Sluice — progress & state (compact anchor)

> Durable session state so context can be re-derived cheaply. Canonical rules/constants live in
> **CLAUDE.md** (read it first). This file = what's done + how it's wired + what's next.

## Live
- Web (Vercel): **https://sluiceflow.vercel.app** — auto-deploys on push to `main`.
- API (VPS, pm2 `sluice-api`): public at **https://sluiceflow.vercel.app/gw**, gateway backend, SQLite/Drizzle.
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
- API_PUBLIC_URL (for RSL/llms.txt/badge links) defaults to https://sluiceflow.vercel.app/gw.

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

- **Phase 11** (stretch — OSS connectors): PeerTube LIVE (connectors/peertube.ts — ingest real
  videos from any public PeerTube instance as per_second resources, open API no keys; verified 5 from
  framatube.org). Navidrome (per_listen) + Owncast (per_second) real adapters in connectors/oss.ts,
  labeled "available" (need your instance — not faked). GET /connectors catalog; POST /connectors/
  {peertube,navidrome,owncast}. Docs Connectors page updated. Ingested resources auto-surface in
  Bazaar + Streams.

## STATUS: Phases 0-11 COMPLETE + live on Arc. Tags v1.0.0 (core), v1.1.0 (stretch). Spend routes
rate-limited; spendLimit defined near top (TDZ-safe). FundingPool in deployed.json.

- **Phase R0** (overhaul: audit + purge): scripts/site-audit.ts (Playwright; desktop+mobile, console/
  network/screenshots, safe-mode click audit, link check, text scans, overflow detection; AUDIT_GENTLE
  + Vercel bypass header + HTTP-parity fallback because Vercel Bot Filter 403/708-challenges headless
  browsers — platform security, documented, not an app defect). RESULT: ZERO defects local (full gate)
  + live (content parity). Fixed: $$ double-dollar (VerifyReceipt; formatUSD single-$ unit test), raw
  feed HTML (lib/sanitize.ts — handles feeds truncated MID-TAG + orphan href attrs + URLs→hostname),
  "depositinto" joined word, IP purge (next.config /gw/:path* rewrite; all docs/SDK/MCP/API links via
  domain; grep-clean), archived flag (migration 0007) + scripts/curate-resources.ts (17 archived, 2
  renamed → 13 curated; receipts immutable, serializeReceipt.resourceName), settlements mobile card
  layout, grid-cols-1 minmax(0,1fr) fix (line-clamp min-content 669px overflow), navbar links truly
  centered, sidebar sticky h-dvh (footer always visible). DOMAIN RENAMED: sluiceflow.vercel.app
  (sluice-six 307s; same Vercel project). VERCEL_BYPASS_SECRET in secrets env.

- **Phase R1** (brand + visual foundation): all 8 docs/ images opened+verified (rule 18) →
  /public/brand canon via scripts/build-brand.mjs (sharp+potrace+opentype.js, rerunnable): glyph
  alpha-extracted (noise floor <28) + vectorized; SLUICE wordmark RE-SET IN MICHROMA everywhere
  (lockups, banner — old text erased via clean-patch fill, verified by eye; og-card 1200x630 with
  subtle halftone + flow hairline; favicon set + webmanifest; texture-dots.webp 85KB). packages/ui
  logo-paths.ts GENERATED → <Logo>/<LogoMark> = inline currentColor vectors (zero flash). 404 +
  loading pages. Design v2: --flow (#6FE3F0/#0E7490) ONLY on live dots (--live=flow), steel-link
  hover, CTA hover glow, live meter ticking digits. .texture-layer fixed site-wide (dark invert+
  screen 5.5%, light multiply 0.5, radial vignette, translateZ(0)). .card-v2 gradient hairline +
  top-light + hover lift/flow-glow — one Card primitive, all surfaces. Audit: ZERO defects local.
  GOTCHAS: sharp ops apply in libvips FIXED order (sequence via separate passes); librsvg needs
  style="color:" for currentColor; Vercel WAF/Bot Filter 403/708-challenges headless browsers AND
  (after repeated crawls) curl from this IP — harness auto-falls-back to HTTP parity; bypass secret
  VERCEL_BYPASS_SECRET in secrets env (deployment-protection scope). NEXT_PUBLIC_APP_URL env fixed
  → https://sluiceflow.vercel.app (og:image canonical; re-verify visually when WAF cools).

## NEXT: R2 (motion system) — user has pasted the spec. Then R3+ when provided.

- **Phase R2** (motion system): packages/ui/src/motion/ — Reveal (IO fade+rise, stagger), CountUp
  (rAF eased, real values only; RSC-safe prefix/decimals props — function props can't cross the RSC
  boundary), PulseDot (flow ping), RowEnter (top-of-feed slide-fade cascade), TickerDigits (per-digit
  rolling odometer, transform-only; pause freezes exactly). Skeleton shimmer (translate sweep).
  Pressable = Button base (active:scale-.98). PageTransition = app/template.tsx (.page-enter).
  Keyframes in tokens.css (sluice-ping/row-enter/page-enter/shimmer/pop); html smooth-scroll under
  no-preference. CSS/rAF ONLY (no framer-motion dep — lighter option per session rules). Applied:
  Overview KpiTiles CountUp + RowEnter feed; Settlements row cascade (cards + <tr>) + Verify
  confirm state (green pop "Verified"); AgentTrace cascade; spend budget bar 500ms ease; LiveMeter
  TickerDigits odometer (flow accent while flowing) + PulseDot proof-of-flow; Treasury CountUp +
  honest 2-state withdraw progress (burn-intent submitted → minted, real states only) + minted pop;
  landing Reveal staggers (unit tiles, steps, economy viz, verify card); /app/_dev/tokens Motion
  group. PERF GATE: CLS 0.0000-0.0005 on / /app /app/meter /app/settlements; long tasks = hydration
  only; all animations transform/opacity. Audit ZERO defects. Reduced-motion: every primitive static.

- **Phase R3** (landing rebuild — the living-logo hero): components/marketing/hero-flow.tsx —
  canvas 2D rAF (NO three.js): full-width luminous pipe, 160-340 particles riding 12 converging
  trace-lanes (the banner motif animated), the REAL potrace glyph as the gate (Path2D from
  logo-paths; potrace space = translate(0,1254) scale(0.1,-0.1)), meter pulse every ~22 particles →
  glyph flow-flash + discrete settled drops exiting right with fading receipt ticks; floaters show
  REAL recent receipt amounts; sprite glows (no shadowBlur), DPR≤2, pause on hidden/off-screen,
  theme observer, scroll parallax (compositor transform). Reduced-motion/pre-hydration = designed
  static SVG schematic w/ latest real settlement printed (HeroSchematic). Hero layout: centered
  thesis "Make the smallest unit sellable." + full-bleed canvas band. Ask module: staggered citation
  entrances + per-citation RECEIPT strip (paid $x → author, on-chain tx or Gateway-attested link) +
  CountUp total. EconomyViz v2: 7-day window w/ honest all-time fallback (never empty), 12s poll
  diffs NEW settled receipt ids → REAL bright pulses + "live — just settled" status; ambient history
  replay when quiet ("quiet right now"); labeled columns; measured label truncation. VerifyReceipt:
  PulseDot + copy-able Circle ref (CopyRef). Unit tiles: line-art draw-in hover (sluice-draw).
  PERF: wallet stack (wagmi+AppKit) SPLIT OUT of marketing — Providers now mounts under /app only
  (root layout = UiProviders: toasts+tooltips; console layout does cookie hydration); marketing
  header drops the Connect button; texture bg applied on idle (TextureLayer) off the LCP path.
  LIGHTHOUSE: desktop 99 (TBT 0ms, LCP 0.8s, CLS 0) ✓ DoD; mobile-emulated 70 on this shared VPS
  (was 47) — remaining gap is the 4x-throttled starved vCPU, not app weight (32KB chunk "6.2s").
  Both themes screenshot-verified; audit ZERO defects. Old HeroMeter deleted.
  R3 PERF ITERATION: hero split into LAYERED canvases — statics (lanes+pipe+ambient+base glyph)
  painted ONCE to their own element; the rAF layer only clears+sprites (~2ms JS/frame). Particles
  source-over (additive across full width kills software raster); texture layer's mix-blend-mode
  REMOVED (blend modes force full-viewport recomposites every frame; plain alpha identical at 5%).
  Measured on the GPU-less VPS (SwiftShader): mobile 60fps locked, desktop ~20fps raster-bound
  (control: /docs 60fps, /?noanim 60fps → the gap is software compositing of a full-width animated
  canvas, not app JS — real desktops composite on GPU). ?noanim debug switch kept.
