# Sluice — engineering handoff (for Codex or any agent picking this up)

You are continuing **Sluice**, a settlement layer for the agent-paid web on **Arc** (Circle's L1).
Phases 0–11 are **complete, live, and tagged**. This file is your brain. Read it fully, then read
`CLAUDE.md` (rules/constants) and `PROGRESS.md` (per-phase state) before touching anything.

- **Live app:** https://sluice-six.vercel.app
- **API (VPS, pm2 `sluice-api`):** http://62.171.182.75:3001
- **Repo:** https://github.com/Franlinozz/Sluice — default branch `main`, tags `v1.0.0` (core 0–9),
  `v1.1.0` (stretch 10–11). HEAD `d421b0a`.
- **Network:** Arc testnet, chainId `5042002`, USDC `0x3600000000000000000000000000000000000000` (6dp).

## 0) Non-negotiable rules (from CLAUDE.md — do not violate)

1. **NEVER fake data.** Every number/receipt/stat must trace to the DB or the chain. If you can't
   make something real, ship it labeled `beta`/`available`/`roadmap` — never fake it.
2. **No dead controls.** Every button/link/toggle works or is visibly disabled with a stated reason.
3. **Decimals discipline.** Payment USDC = 6dp, handled as `bigint` base-unit strings — never floats.
   Native Arc gas = 18dp, tracked separately. Never coerce between them.
4. **Network-agnostic settlement.** Don't hardcode assumptions that break mainnet.
5. **Commit at every green DoD.** One concern per commit. PR-sized diffs.
6. **Gateway reality:** Circle Gateway settles batched nanopayments **gas-free via an attested
   ledger** — there is **no per-payment tx hash**; each settlement carries a Circle transfer UUID.
   On-chain anchors are: deposits, withdrawals (Gateway Minter mint), royalty splits, bonds, funding
   sweeps. EIP-3009 auths need long validity (`MAX_TIMEOUT_SECONDS=2_592_000`, 30d) or Circle rejects
   with "authorization_validity_too_short".

## 1) Environment & access

- **Working dir:** `/root/Sluice`. Node 22, pnpm 9.15.9 workspaces, Foundry (forge 1.7.1), pm2.
- **Secrets:** `/root/.sluice-secrets/sluice.env` (chmod 600, **gitignored, NEVER commit**). Vars:
  `ARC_WALLET_PRIVATE_KEY`, `BUYER_PRIVATE_KEY` (= operator/arbiter, funded), `SELLER_PRIVATE_KEY`
  (= provider), `BUYER_ADDRESS`/`SELLER_ADDRESS`, `OPENAI_API_KEY`, `NEXT_PUBLIC_REOWN_PROJECT_ID`,
  `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`. Also `apps/web/.env.local` (gitignored).
  Load with `set -a; . /root/.sluice-secrets/sluice.env; set +a`.
- **Wallets:** operator/buyer `0xBd88eAE165F8A00B1B33357Fb0880CD4fE5C5E70` (funded: Arc USDC + gas;
  Base Sepolia + Ethereum Sepolia gas for cross-chain). provider/seller
  `0x303c819cbb4d7481721e5310E2b120C2a2cdfC58`. The user shares keys knowingly — do NOT lecture about
  key rotation; just keep secrets out of git and the client bundle.
- **Other pm2 apps on this VPS are OTHER projects — NEVER touch:** `archon-web`, `archon-worker`,
  `tessera-indexer`, `tessera-worker`. Only manage `sluice-api`.
- **Deploy:** push to `main` → Vercel auto-builds `apps/web` (root dir set to `apps/web`). API runs on
  the VPS via pm2; after API changes: `pm2 restart sluice-api`. Poll a Vercel deploy with
  `vercel inspect <url> --token=$VERCEL_TOKEN`.
- **When you need an interactive login** (rare), ask the user to run it with a leading `!` in the CLI.

## 2) Deployed + verified contracts (Arcscan, chainId 5042002)

Addresses live in `apps/api/src/contracts/deployed.json` (committed; public):
- IdentityRegistry `0x8e856716d653db35eb4dac7616648172cebeba34` (minimal ERC-8004 Identity)
- ReputationRegistry `0x6593cd1eb1dec37797aee650d48ad2f4d910cbd4` (1–5 feedback)
- BondEscrow `0x1bf29623c8a74c13bc4e27bbe72037a24976c0c1` (post/release/slash; arbiter = operator)
- FundingPool `0xf7ef1d456e74736bbf346c29f74e28c60ce3ade8` (quadratic matching, single-tx sweep)
- Also: Gateway Wallet `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`, Gateway Minter
  `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B`, per-resource RoyaltySplitters (deployed on demand).

**Sample real txs (verifiable):** same-chain withdrawal `0x78bfcc…423673da`; cross-chain (Arc→Base
Sepolia) mint `0xa6e27ea6…948b677c`; QF single-sweep `0xa97deb20…484e46a3a`.

**Verifying a new contract on Arcscan (it's Blockscout):**
```
forge verify-contract <addr> src/X.sol:X --verifier blockscout \
  --verifier-url https://testnet.arcscan.app/api/ --chain-id 5042002 \
  --constructor-args $(cast abi-encode "constructor(...)" ...) --watch
```

## 3) Repo map

```
apps/
  web/    Next 16 (App Router, RSC) · React 19 · Tailwind v4 · wagmi v3 · @reown/appkit
          src/app/ (routes), src/components/, src/lib/{api.ts, docs.tsx, nav.ts}
  api/    Fastify 5 · SQLite + Drizzle (better-sqlite3). THE server. src/index.ts = all routes.
          src/{meter,agent,payments,contracts,connectors,funding,treasury,db}
          scripts/ (deploy + seed + smoke scripts, run via `pnpm --filter @sluice/api exec tsx …`)
  agent/  CLI agent runtime
  mcp/    @sluice/mcp — stdio MCP server (discover/price/pay/receipts/register)
packages/
  chain/  @sluice/chain — arcConfig, viem clients (getClient/getWalletClient), explorer URLs
  money/  @sluice/money — 6dp USDC bigint helpers (parseUSDC/formatUSDC/…), NEVER floats
  ui/     @sluice/ui — Graphite design system (Button, Card, Pill, AddressChip, AmountMono, …)
  contracts/ Foundry (src/*.sol, out/), solc 0.8.28
  sluice-pay/ @sluice/pay — SDK: one-call x402 payment, deposit-aware, budget/reason hooks
```

- **Web reads the API server-side** (Server Components + server actions) to avoid https→http mixed
  content. Client-side calls go through the same-origin proxy `app/api/sluice/[...path]/route.ts`
  (`/api/sluice/*` → VPS API). Client mutation controls all POST through that proxy.
- **api.ts** (`sluiceApi.*`) is the typed fetch layer + all DTOs. Add new fetchers/types here.
- **New tsconfig path** for any new package must be added to `tsconfig.base.json` `paths`. Apps that
  import workspace packages must NOT set `rootDir` (path-mapped sources live outside it).

## 4) Build / run / verify commands

```bash
# typecheck (do this after every change; it's the CI gate)
pnpm --filter @sluice/api run typecheck
pnpm --filter @sluice/web build   # (needs: set -a; . apps/web/.env.local; set +a)

# API: after editing api/, restart the live server + wait for health
pm2 restart sluice-api
curl -s --retry 20 --retry-connrefused --retry-delay 1 --max-time 25 http://localhost:3001/health

# DB migrations (Drizzle): edit src/db/schema.ts → generate → applied on boot
pnpm --filter @sluice/api run db:generate     # writes apps/api/drizzle/000N_*.sql
# migrations auto-apply on API start (src/db/client.ts runMigrations)

# run a script (env-aware, resolves workspace deps)
pnpm --filter @sluice/api exec tsx scripts/<name>.ts
```

Contract flow: write `.sol` in `packages/contracts/src` → `cd packages/contracts && forge build` →
generate ABI+bytecode TS into `apps/api/src/contracts/<name>.ts` (see existing generator one-liners in
git history / `scripts/deploy-*.ts`) → deploy via a tsx script using `getWalletClient().deployContract`
→ verify with forge/blockscout → record address in `deployed.json`.

## 5) What each phase shipped (all live + verified)

- **P0–P3:** monorepo + Graphite UI + SSR-safe wallet; the **Meter** (unit-agnostic accrual, deferred
  batch settle, reconciler, receipts, KPIs); the **paying agent** (gpt-4o-mini + deterministic mock,
  enforces budget/ceiling); **citation toll** (agent pays per cited source) + on-chain **royalty
  splits** (per-resource `RoyaltySplitter`); RSS connector; RSL/llms.txt/earned badge; `/ask`.
- **P4 Streaming meter:** `apps/api/src/meter/streaming.ts` — per-second lazy accrual + reserve cap;
  **proof-of-flow** heartbeat auto-pause (freezes at last heartbeat → no dead-air charge). UI
  `/app/meter` + `/app/meter/[id]` (LiveMeter, real accrual + smooth interp, simulate-flow-loss).
- **P5 Reputation bonds + Bazaar + Treasury:** ERC-8004 registries + BondEscrow (above). Broker:
  provider self-bonds → arbiter slash(→buyer)/release(→provider) + ERC-8004 feedback. `broker.ts`,
  `contracts/escrow.ts`. UI `/app/discover` (Bazaar) + `/app/agents` (bond ledger + Release/Slash).
  Treasury `/app/treasury` real balance + **real withdrawals** (`treasury/withdraw.ts`): instant Arc
  mint + cross-chain (pre-flights destination gas, refuses before burning — no stranded funds).
- **P6 Landing:** cinematic `/` — canvas meter (`hero-meter.tsx`, reduced-motion), **LiveStats**
  (real KPIs, 60s poll, count-up), "one meter every unit", real **AskBox** embed, **EconomyViz**
  (agents→creators from real receipts), **VerifyReceipt** (latest real receipt + Circle transfer ID +
  Arcscan anchors), how-it-works, footer. All numbers real (`meter.ts` aggregates + `creatorsPaid`).
- **P7 SDK + MCP:** `@sluice/pay` (`packages/sluice-pay`) — `discover/getPrice/balance/deposit/pay`
  with per-call `maxAmount`, cumulative `budget`, `onDecision` hook, deposit-aware. **Gotcha:**
  `GatewayClient.pay()` returns `amount` as **bigint atomic** + `formattedAmount` string — use the
  latter for display. `@sluice/mcp` (`apps/mcp`) — tools discover_resources/get_price/pay_resource/
  get_receipts/register_resource; needs `SLUICE_PRIVATE_KEY` to pay. Verified via `scripts/smoke.mts`.
- **P8 Docs + whitepaper:** bespoke Graphite docs `/docs/[[...slug]]` (sidebar, ⌘K search, scroll-spy
  TOC, prev/next, reading-progress) — content in `apps/web/src/lib/docs.tsx`, chrome in
  `components/docs/`. Whitepaper PDF via `scripts/generate-whitepaper.mjs` → `apps/web/public/
  sluice-whitepaper.pdf` (pdfkit; real 2026 facts only). `CHANGELOG.md` + in-docs changelog + FAQ.
  **Note:** we deliberately did NOT use Fumadocs (chose bespoke for Tailwind-v4/Next-16 cohesion).
- **P9 QA + submission:** rate limiting (`@fastify/rate-limit`, 240/min global, 20/min money routes
  via `spendLimit` route option — defined near the top of `index.ts`, TDZ-safe). No secrets in client
  bundle (verified). `SUBMISSION.md` (demo script, no-dead-controls checklist, honesty). Tag v1.0.0.
- **P10 Quadratic funding (stretch):** `FundingPool.sol` + `funding/quadratic.ts` (match =
  (Σ√(wᵢcᵢ))²−Σcᵢ, α-scaled, integer isqrt) + `funding/pool.ts` (real on-chain tips; sybil weight via
  ERC-8004 identity/nonce — **honest heuristic, not proof-of-personhood**; a round commits a matching
  **budget**, pool is funded to cover matches at settle). Migration 0006. UI `/app/funding`. Verified:
  breadth ($0.0339) beats size ($0.00) on equal raised; single-sweep `0xa97deb20…`.
- **P11 OSS connectors (stretch):** PeerTube **LIVE** (`connectors/peertube.ts` — real videos from any
  public instance → `per_second` resources; verified 5 from framatube.org). Navidrome (per_listen) +
  Owncast (per_second) real adapters in `connectors/oss.ts`, labeled **available** (need your
  instance). `GET /connectors` catalog; `POST /connectors/{peertube,navidrome,owncast}`.

## 6) API surface (base http://62.171.182.75:3001)

`GET /health /kpis /resources[/:id] /receipts[/:id] /gateway/balance /feeds /connectors` ·
`GET|POST /paid/:path` (x402 402→pay→200) · `POST /resources /research /connectors/{rss,peertube,
navidrome,owncast} /settle /reconcile` · streaming `POST /sessions [+ /:id/{heartbeat,pause,resume,
stop}]` · bonds `GET /contracts /reputation` `POST /matches [/:id/resolve]` · treasury `GET
/treasury/{chains,balance}` `POST /treasury/withdraw` · funding `GET /funding` `POST /funding/{tip,
settle}`. Money-moving routes are rate-limited (20/min); set `RATE_LIMIT_MAX=0` to disable in tests.

## 7) Known gotchas / bug register

- **Bodyless POSTs** (heartbeat/pause/stop) send `content-type: application/json` with empty body →
  Fastify 400 before the handler. Fixed by a custom `application/json` content-type parser in
  `index.ts` that treats empty body as `{}`. Keep it.
- **BigInt over JSON:** Fastify can't serialize `bigint`. Convert to strings before returning (see
  `broker.ts` serialize, `funding/pool.ts` `fundingState`). Watch this on every new endpoint.
- **`GatewayClient.pay().amount` is atomic bigint**, not decimal — use `formattedAmount`.
- **Cross-chain withdraw** needs native gas on the destination chain (the client submits the mint).
  Always pre-flight dest gas and refuse before burning (already done). Arbitrum Sepolia had 0 gas.
- **TDZ:** `const spendLimit` (route rate-limit option) must be defined before any route that uses it.
- **Migrations:** never hand-edit an applied migration; if a partial migration wedges a table, drop it
  with a tsx + better-sqlite3 script run from `apps/api`, then restart to re-apply cleanly.
- **viem/better-sqlite3 ESM:** run scripts via `pnpm --filter @sluice/api exec tsx` from `apps/api`.
- **Python one-liners in bash:** avoid nested escaped quotes in f-strings (they break in `-c`).

## 8) What's LEFT to do (your job)

**Required to finish the hackathon submission (human-gated bits marked):**
1. **Demo video (<3 min)** — record following the script in `SUBMISSION.md`. *(needs a human/screen
   recorder — you can't record; prep the script/scenes and hand back.)*
2. **File the hackathon submission form** — *(human-only; everything it needs is in `SUBMISSION.md`.)*
3. **Fold stretch phases (10–11) into `SUBMISSION.md`** (funding pool + connectors) and the landing/
   changelog so the submission reflects 0→11. *(you can do this.)*
4. **Lighthouse pass on the landing** — not run yet (no headless Chrome in the build env). Run it,
   then tune anything it flags (image/font loading, CLS). *(needs a browser/CI with Chrome.)*

**Polish / roadmap (real, not faked; pick up as budget allows):**
- Wallet-driven **self-service deposit/withdraw** in the UI (currently operator-key server-side).
- **Mainnet config** pass (settlement is network-agnostic; wire real mainnet Arc/USDC/Gateway env).
- **Proof-of-personhood** sybil layer for funding (Gitcoin Passport / BrightID) to replace the
  heuristic — clearly a roadmap item today.
- More connectors truly-live (Owncast/Navidrome against real instances if the user provides them).
- Surface `/connectors` catalog in Creator Studio UI (backend + docs exist; no UI card yet).
- Accessibility deep pass (keyboard/focus audit across all primitives) + console-error sweep.

**Ground rules for you:** run each change's Definition of Done, paste evidence (txs, Arcscan links),
commit one concern at a time. If a library fights you, fall back to the lighter option. Ship real or
labeled — never fake. Keep `PROGRESS.md` updated as the durable anchor when context gets large.

## 9) How to prove things are real (sanity commands)

```bash
curl -s http://62.171.182.75:3001/kpis            # real settled totals
curl -s http://62.171.182.75:3001/funding         # QF pool + live match preview
curl -s http://62.171.182.75:3001/contracts       # verified contract addresses + Arcscan urls
# then open any address/tx on https://testnet.arcscan.app to verify independently
```
