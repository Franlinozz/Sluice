# SLUICE — Project Rules & Constants (read this fully every session)

> First action of every session: **read this entire file.** Everything you build obeys it.
> Working tree is `/root/Sluice` (this is NOT Tessera/Xyndicate/Agora/Apogee/Archon/Auralis —
> never touch those projects). Repo: `Franlinozz/Sluice`. Vercel project: `sluice`
> (`prj_P12m6QjGi3gFtPSCfXbDTiGJRbi9`, team `franlinozzs-projects`).

## What we're building
Sluice is a settlement layer for the agent-paid web. Any unit of value — a read, a
second, a citation, a listen, an API call — is metered and settled on Arc in USDC.
Creators get paid per use; agents pay per use and DECIDE for themselves.
Hero use case: AI research agents pay creators PER CITATION (the open, creator-owned
alternative to Cloudflare Pay-Per-Crawl / RSL, which declare terms but don't settle).

## Non-negotiable rules
1. NEVER fake data, balances, figures, transactions, or "working" integrations. A clearly
   labeled "beta"/"coming soon"/"roadmap" state ALWAYS beats a fake. Every number shown to a
   user must trace to a real on-chain (Arc testnet) event or a real DB record.
2. NO DEAD CONTROLS. Every button/link/toggle either works or is visibly disabled with a
   stated reason (tooltip/label). The product owner is not a deep dev and cannot spot a
   silent no-op — so there must be none.
3. Network-agnostic settlement. All chain/settlement access goes through ONE interface
   (packages/chain). Arc Testnet is primary; swapping the RPC provider (or, last resort, another
   network) must be a config change, never a code rewrite. Do NOT scatter RPC URLs/chain IDs.
4. Meter decoupled from settlement backend. The accrual engine must not care whether the
   final settle is Gateway-batched or a direct x402 call. If Gateway-on-Arc misbehaves, we
   can fall back to direct x402 settlement without touching accrual logic.
5. USDC DECIMALS DISCIPLINE (critical):
   - ERC-20 USDC used for PAYMENTS = 6 decimals. All payment amounts, EIP-3009 values, and
     ledger math use 6-decimal integer base units. Use viem parseUnits(amount, 6).
   - Arc's NATIVE GAS token is USDC displayed with 18 decimals. Never mix gas display with
     payment amounts. Keep a single money helper (packages/money) and route all amounts through it.
6. EIP-3009 is signed against the GATEWAY WALLET CONTRACT, not the USDC token contract.
   The x402 `scheme` field is `"exact"`; the string `"GatewayWalletBatched"` is the EIP-712
   DOMAIN NAME placed in `extra.name`, with `extra.verifyingContract` = the Gateway Wallet.
   (This is the #1 thing teams get wrong — see "x402 payment requirements shape" below.)
7. One-time deposit required: a wallet must deposit USDC into the Gateway Wallet contract
   BEFORE it can make nanopayments. Build and surface this step explicitly.
8. Settlement LAG is real: seller earnings appear only AFTER Circle Gateway settles the batch
   on-chain (can take minutes). UI must show honest states: authorized → batching → settled.
   Never show settled balance the instant a payment is authorized.
9. Money in code is always integer base units (bigint). Format for display only at the edge.
   JSON cannot carry bigint — serialize bigints as strings, parse back at boundaries.
10. Verify before assuming. When unsure of an API shape, address, or version, READ the
    canonical source (links below) or the arc-nanopayments repo — do not invent signatures.
11. Commit after every green Definition of Done, with a clear message. Keep PR-sized diffs.
12. Secrets: server-only keys live in env, never in client bundles. In Next.js, only
    NEXT_PUBLIC_* is exposed to the browser. Private keys/API keys must NEVER be NEXT_PUBLIC_.

## Verified constants (Arc Testnet — CONFIRMED against circlefin/arc-nanopayments, June 2026)
- Chain ID: 5042002 · CAIP-2 network id: `eip155:5042002`
- Primary RPC: https://rpc.testnet.arc.network
- Backup RPCs (same chain, ordered fallback; keep Arc primary, quiet):
  Alchemy https://arc-testnet.g.alchemy.com/v2/<key> · dRPC https://arc-testnet.drpc.org
- Explorer: https://testnet.arcscan.app   (link every tx/receipt here)
- Native gas token: USDC (18-decimal display on Arc). Faucet: ~1 USDC/day — budget it.
- Finality: sub-second (Malachite consensus). EVM-compatible.
- **USDC token contract (ERC-20, 6 decimals, for PAYMENTS):** `0x3600000000000000000000000000000000000000`
- **Gateway Wallet contract (verifyingContract for EIP-3009): `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`**
  ✅ CONFIRMED in arc-nanopayments `lib/x402.ts`. Still read from env in code; do not scatter.
- Circle "domain" id for Arc Testnet (Gateway/CCTP): **26**
- Gateway balances API (testnet): https://gateway-api-testnet.circle.com/v1/balances
  POST `{ token: "USDC", sources: [{ domain: 26, depositor: <addr> }] }`

## x402 payment requirements shape (verified from arc-nanopayments lib/x402.ts)
```
requirements = {
  scheme: "exact",
  network: "eip155:5042002",
  asset: "0x3600000000000000000000000000000000000000", // USDC token, 6dp
  amount: "<atomic base units, 6dp, as string>",        // e.g. $0.001 -> "1000"
  payTo: sellerAddress,
  maxTimeoutSeconds: 345600,
  extra: { name: "GatewayWalletBatched", version: "1",
           verifyingContract: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" },
}
```
- 402 response: HTTP 402, header `PAYMENT-REQUIRED` = base64(JSON({ x402Version: 2, resource, accepts: [requirements] })).
- Retry with header `payment-signature` = base64(JSON(paymentPayload)).
- On success the server sets header `PAYMENT-RESPONSE` = base64(JSON({ success, transaction, network, payer })).

## @circle-fin/x402-batching API (verified, v2.x — what we pin)
- Server: `import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server"`
  `const f = new BatchFacilitatorClient()`
  `await f.verify(paymentPayload, requirements)` -> `{ isValid, invalidReason, payer }`
  `await f.settle(paymentPayload, requirements)` -> `{ success, errorReason, payer, transaction }`
- Client: `import { GatewayClient, GATEWAY_DOMAINS, type SupportedChainName } from "@circle-fin/x402-batching/client"`
  `new GatewayClient({ chain: "arcTestnet", privateKey })` — `.address`,
  `.getBalances()` -> `{ wallet: { formatted }, gateway: { formattedAvailable, ... } }`,
  `.withdraw(amount, { chain, recipient })` -> `{ mintTxHash, formattedAmount, sourceChain, destinationChain, recipient }`
- Supported chains: arcTestnet, baseSepolia, sepolia, arbitrumSepolia, optimismSepolia, avalancheFuji, polygonAmoy.
- NOTE: npm latest is 3.2.0; we deliberately pin ^2.0.4 (the verified known-good API above).
  Re-evaluate v3 in the payment phase by reading its changelog/types — do not blind-upgrade.

## Canonical sources of truth (fetch these, don't guess)
- Reference repo (the plumbing baseline): https://github.com/circlefin/arc-nanopayments
  Uses: `@circle-fin/x402-batching` (BatchFacilitatorClient server, GatewayClient buyer),
  a `withGateway(handler, "$0.001", "/path")` paywall wrapper in lib/x402.ts,
  `npm run generate-wallets`, `npm run dev`, `npm run agent`, dashboard at /dashboard.
  Storage = Supabase (payment_events, withdrawals). Agent = LangChain + deepagents (mock fallback).
- Gateway Nanopayments docs: https://developers.circle.com/gateway/nanopayments
- Agent Stack / Agent Nanopayments: https://developers.circle.com/agent-stack/agent-nanopayments
- Arc docs (chain config, App Kit, samples): https://docs.arc.network
- x402 spec + SDKs: https://github.com/coinbase/x402  (packages: @x402/core @x402/evm @x402/fetch
  @x402/express @x402/hono @x402/next ...). CAIP-2 network id for Arc testnet = eip155:5042002.
- Reown AppKit docs: https://docs.reown.com/appkit/next/core/installation (SSR + wagmi).
- Circle Skills + MCP server (for agent wiring + live addresses): https://developers.circle.com/llms.txt
- RSL (Really Simple Licensing) standard (terms layer we settle for): rslstandard.org
- Hackathon: https://lepton.thecanteenapp.com

## Payment flow (the exact 8 steps — memorize)
1. Buyer deposits USDC into Gateway Wallet contract (one-time).
2. Buyer requests a paid resource. Server returns 402 + PAYMENT-REQUIRED header
   (scheme "exact" + extra.name "GatewayWalletBatched" + Gateway Wallet verifyingContract + price).
3. Buyer signs EIP-3009 TransferWithAuthorization AGAINST THE GATEWAY WALLET CONTRACT.
4. Buyer retries with payment-signature header.
5. Gateway verifies signature (<1s).
6. Gateway queues for batched on-chain settlement (gas-free both parties).
7. Server returns the resource immediately (instant verification, deferred settlement).
8. Seller revenue appears in Gateway balance after batch settles; withdraw cross-chain.

## Architecture (how the build pack's intent maps to a deployable system)
Monorepo (pnpm workspaces). Web deploys to **Vercel**; long-running services run on the **VPS**
via pm2. Shared logic lives in packages so the Meter stays decoupled and reusable.
- `apps/web`   — Next.js (App Router, TS strict): public site + `/app` console + `/docs`
  + the x402-protected resource endpoints + light read APIs. Deploys to Vercel.
  (x402-batching server SDK is Next-route-native; matches the reference. Deploy target = Vercel.)
- `apps/api`   — Fastify (TS): THE METER (accrual engine), batch-settlement timers/workers,
  connector webhooks, settlement reconciliation. Long-running/stateful → runs on the VPS (pm2).
- `apps/agent` — buyer/broker agent runtime (TS). Runs on the VPS (pm2).
- `packages/chain`    — network-agnostic chain/settlement interface (Arc primary + ordered RPC fallback).
- `packages/money`    — the single money helper (6-dec USDC, bigint-safe parse/format/serialize).
- `packages/ui`       — design-system primitives + Graphite theme tokens + self-hosted fonts.
- `packages/contracts`— Foundry (ERC-8004, RoyaltySplitter, Bond/Escrow) — stubs for now.
- (later) `packages/meter`, `packages/db`, `packages/x402` may be split out as they harden.

## Pinned versions (verified on npm, June 2026 — install these; update here when changed)
Rationale: match Circle's reference repo + current ecosystem. We pin conservatively where a
brand-new major adds risk (TS 6, zod 4, wagmi 3, x402-batching 3).
- Runtime/build: next ^16.2 · react ^19.2 · react-dom ^19.2 · typescript ~5.9 (NOT 6.x yet)
- Styling: tailwindcss ^4.3 · @tailwindcss/postcss ^4.3 · postcss ^8 · tw-animate-css (optional)
- Wallet: wagmi ^3.6.18 · viem ^2.53 · @tanstack/react-query ^5.101 · @reown/appkit ^1.8.21 ·
  @reown/appkit-adapter-wagmi ^1.8.21
  (VERIFIED via install: adapter-wagmi 1.8.21 bundles @wagmi/connectors@8 which requires
  @wagmi/core@3.x — so Reown 1.8.21 targets wagmi **v3**, NOT v2. The initial "pin v2" guess
  was wrong; install proved it. One benign transitive peer warning remains:
  use-sync-external-store@1.2.0 wants react<=18, but React 19 has the hook natively — silenced
  via pnpm.peerDependencyRules in the root package.json.)
- Payments (added in payment phase): @circle-fin/x402-batching ^2.0.4 · @x402/core ^2.6 ·
  @x402/evm ^2.6 · @circle-fin/cli (Node 20.18.2+)
- UI: lucide-react ^1.21 · recharts ^3.9 · motion ^12.40 (the framer-motion successor) ·
  sonner ^2.0 · class-variance-authority · clsx · tailwind-merge · radix-ui primitives (shadcn)
- Validation: zod ^3.25 (NOT v4 yet)
- Backend (apps/api): fastify ^5.8 · @fastify/cors · drizzle-orm ^0.45 (or supabase-js if we use Supabase)
- Agent: @langchain/core ^1.2 · @langchain/openai ^1.5 · deepagents ^1.10 (model gpt-4o-mini, mock fallback)
- Contracts: foundry (forge 1.7.x)
- Tooling: pnpm 9.15 · Node 22.x (Circle CLI needs >=20.18.2 — satisfied)

## Deviations from the original build pack (deliberate, documented)
- Build pack said Next 15 + Tailwind v3. We use **Next 16 + Tailwind v4** to match Circle's
  reference repo and the June-2026 ecosystem (the core payment packages are tested against it,
  and Tailwind v4's CSS-first `@theme` is ideal for the "all colors via CSS vars, no hex" rule).
- Build pack said wagmi/viem generically; we pin **wagmi v2** (not v3) for Reown AppKit compat.
- `apps/api` folds the x402 *paywall endpoints* into Next route handlers (Vercel) and keeps the
  *Meter + timers* in the Fastify service (VPS). Same intent, deployable shape.

## Stack (pinned choices — see "Pinned versions")
- Frontend: Next.js 16 (App Router, TS strict) · Tailwind v4 · shadcn/ui (restyled) ·
  lucide-react · Recharts · motion (Framer) · light SVG/canvas for hero (r3f only if it earns it).
- Wallet: Reown AppKit (email + social + injected wallet — the consumer modal) + wagmi/viem.
  Plus Circle USER-CONTROLLED wallet option (Web2 login → embedded). Free WalletConnect projectId.
- Payments: @circle-fin/x402-batching + @x402/* + Circle CLI (@circle-fin/cli, Node 20.18.2+).
- Backend: Fastify (TS). Postgres (Supabase or self-hosted) or SQLite for speed.
  NO Docker required — runnable directly on a VPS via pm2/systemd.
- Contracts: Foundry. ERC-8004 (Identity/Reputation/Validation), RoyaltySplitter,
  Bond/Escrow. Deploy to Arc testnet (5042002); verify on testnet.arcscan.app.
- Agent: model = gpt-4o-mini (cheap; OpenAI key) with a deterministic MOCK fallback when no key.
  Hard token caps + per-agent USD budget. Cache.

## Theme — greyscale, premium ("Graphite")
Monochrome (shades of grey/white/black, grey emphasis) + ONE cold near-platinum signal accent,
used sparingly. Locked semantic state colors. No hardcoded hex anywhere — all via CSS vars
through Tailwind. Heavy grotesk display + Inter UI + mono for amounts/hashes/rates. Self-hosted
fonts. Motif: thin luminous horizon line + flowing metered particles through a gate ("the sluice").
Dark default tokens: canvas #0A0A0B, surface-1 #111113, surface-2 #17181B, surface-3 #1F2024,
terminal #070708, border-subtle rgba(255,255,255,0.06), border-emphasis #2A2C31,
text-hi #F4F5F6, text-mid #A7ABB2, text-low #6A6E76; signal accent #E8EAED (CTA/active),
cool-steel #9DA7B3 (links/active-nav). Semantic (locked, global): settled #4ADE80 (desaturated),
pending #F5B544, failed #FF6B6B, info #7FA8C9 — rendered as pills (14% bg / full text / 30% border).
Type: heavy geometric grotesk (display) + Inter (UI) + JetBrains/Geist Mono (amounts/hashes/rates).
Eyebrows = small uppercase mono, +0.12em, text-low. Self-host all fonts (next/font/local).

## Anticipated bugs — treat as ACCEPTANCE CRITERIA, not suggestions
- Wallet/Next/SSR: Reown AppKit + wagmi must use SSR-safe config (cookieStorage, ssr:true) and a
  "use client" provider boundary, or hydration mismatches / "window is not defined". WalletConnect
  needs a real projectId (free at cloud.reown.com) — missing → modal silently fails. Wrap wallet
  hooks so disconnected/unsupported-network renders a clear CTA, never blank.
- Hero/3D: any r3f canvas dynamically imported ssr:false; ONE particle system; respect
  prefers-reduced-motion with a static fallback. If three.js fights us, ship the 2.5D SVG/canvas hero.
- Money: 6-dec USDC vs 18-dec native gas mixups → single money helper only. bigint in JSON throws →
  serialize as strings. parseUnits/formatUnits everywhere; never Number(amount) * 1e6.
- x402/Gateway: EIP-3009 signed against the wrong contract → verification fails. Forgetting the
  one-time deposit → "insufficient Gateway balance". Showing settled before batch settles → fake.
  Re-using an EIP-3009 nonce → replay rejection (fresh random nonce each auth). Clock skew on
  validAfter/validBefore → generous windows, server time.
- Arc: wallets may label native balance "ETH" — it's USDC. Don't assert on symbol; assert chainId 5042002.
  RPC hiccups → ordered RPC fallback + retry/backoff, Arc primary.
- Agent: no OPENAI_API_KEY → deterministic mock mode, never crash. Unbounded loop → max steps + USD
  budget + token caps; pause at limit. Validate tool args/URLs before paying; never pay on unparsed output.
- General: configure CORS allowed origins explicitly. Assert at boot that server secrets aren't
  NEXT_PUBLIC_. Reconcile optimistic UI against chain/DB on an interval. Empty states look intentional.

## Gateway settlement reality (VERIFIED on Arc testnet, Phase 1 — important)
Circle Gateway nanopayments settle via a **gas-free, Circle-attested off-chain ledger**, NOT a
per-payment on-chain tx. Verified empirically:
- `BatchFacilitatorClient.settle()` returns a Circle **transfer id** (UUID), not a tx hash.
- A transfer goes `received → completed` in ~40s; its API object exposes NO on-chain tx hash.
- Per-payment settlement debits the payer's Gateway balance and credits the payee's Gateway
  balance (both on-chain state inside the Gateway Wallet contract, updated by Circle's attester).
- The seller address appears in ZERO logs on the USDC token / Gateway Wallet / Gateway Minter —
  i.e. there is NO per-payment on-chain tx referencing payer/payee.
- On-chain materialization happens ONLY at **deposit** (payer → Gateway Wallet) and **withdrawal**
  (Gateway Minter mints USDC out, references the recipient). Those ARE real Arcscan-linkable txs.
- Arc testnet contracts (from CHAIN_CONFIGS.arcTestnet): USDC `0x3600…0000`, Gateway Wallet
  `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`, **Gateway Minter `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B`**, domain 26.
- IMPLICATION for the UI/receipts: a settled receipt is "settled via Gateway (attested)"; its
  on-chain anchors are the deposit tx and the withdrawal/mint tx. Do NOT fake a per-payment tx
  hash. `batchTxHash` stays null; link receipts to the payee + the deposit/withdraw txs. This
  corrects the build pack's "a real batch tx appears per settlement" assumption.
- EIP-3009 authorization window: Circle requires a LONG validity for batched auths — a 4-day
  window failed ("authorization_validity_too_short"); we use 30 days (MAX_TIMEOUT_SECONDS).

## Bug register (append real bugs + fixes here as we hit them)
- [Phase 0, VERCEL 500] Every route 500'd in production (not in `next dev`). Cause: `useAppKit()`
  runs during SSR, but `createAppKit` was guarded behind `typeof window !== "undefined"` so it
  never ran server-side → "Please call createAppKit before using useAppKit hook". FIX: call
  `createAppKit` at module scope guarded ONLY by `hasProjectId` (it is SSR-safe; must run on the
  server too). LESSON: always test the PRODUCTION runtime (`next build && next start`), not just
  `next dev` — dev did not surface this. Also: a deploy's build succeeding ≠ runtime working.
- [Phase 0, VERCEL CONFIG] The `sluice` project needs **Root Directory = `apps/web`** AND
  **Framework Preset = Next.js** (set via API: PATCH /v9/projects). `vercel.json` CANNOT set
  rootDirectory. With both set, zero-config deploy works (Vercel installs the pnpm workspace from
  the repo root automatically). Git is connected → pushes to `main` auto-deploy.
- [Phase 0] wagmi v3 (`@wagmi/core`/`@wagmi/connectors`) references optional connector packages
  via guarded dynamic `import()` (`accounts`, `cbw-sdk`, `porto`, `porto/internal`,
  `@base-org/account`, `@metamask/connect-evm`). The bundler resolves these statically →
  "Module not found". FIX: alias them all to `src/stubs/empty.ts` via `turbopack.resolveAlias`
  in `apps/web/next.config.ts`. (Never imported at runtime; we don't use those connectors.)
- [Phase 0] `_dev`-prefixed folders are PRIVATE in the App Router (excluded from routing), so
  `/app/_dev/tokens` 404'd. FIX: the folder is named `%5Fdev` (URL-encoded underscore) so the
  route is literally `/app/_dev/tokens`.
- [Phase 0, KNOWN-BENIGN] Console shows "Multiple versions of Lit loaded" in dev. Cause: two
  `@reown/appkit` copies (1.7.8 hard-pinned inside `@walletconnect/ethereum-provider`, plus our
  1.8.21) each register Lit web components. It's a Lit dev advisory — not an error, not a
  hydration warning. A `pnpm.overrides` to force 1.8.21 does NOT dedupe (WalletConnect pins
  1.7.8) and risks breaking the wallet SDK, so we leave it. Revisit if the modal misbehaves.
- [Phase 0] `noUncheckedIndexedAccess` (strict) makes array-destructuring elements `T | undefined`.
  In `@sluice/money` use explicit `parts[0] ?? "0"` rather than `const [a, b=""] = str.split(".")`.
- [Phase 0] Non-Next packages that touch `process`/`node:test` need `@types/node` in their OWN
  devDeps (pnpm won't resolve `types:["node"]` otherwise). api/agent tsconfig must NOT set
  `rootDir` (it pulls workspace `.ts` sources outside the dir → TS6059).
