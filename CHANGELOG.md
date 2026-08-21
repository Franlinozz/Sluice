# Changelog

Sluice's hackathon submission snapshot was finalized in [49b0f14](https://github.com/Franlinozz/Sluice/commit/49b0f146ad2c3c42aa1e084961da83184daf46e1) on July 7, 2026. This log separates that baseline from continued product work so reviewers can inspect the delta directly.

## 2026-08-21 — Editorial boardroom hero

- Replaced the landing hero's abstract architectural backdrop with a responsive, editorial boardroom environment while preserving the living Sluice rail animation beneath it.
- Added breakpoint-specific crops, a protected central text field, restrained edge atmosphere, and a seamless graphite fade before the product animation.
- Added a crisp, lifted monochrome treatment for Marble mode, restored selective contrast and boardroom detail in Graphite mode, and reduced the above-the-fold source from 1.54 MiB to a 65 KiB WebP without changing its dimensions.

## 2026-08-16 — Native x402 agent discovery

- Added a public, x402 v2-compatible `GET /discovery/resources` feed generated directly from Sluice's live registry.
- Made discovery filterable by resource type, recipient, scheme, network, and extension, with bounded offset pagination.
- Exposed the exact protected URL and enforced payment requirements for every active listing; archived and inactive resources are excluded.
- Added a live JSON entry point to the Bazaar UI, compatibility documentation, and regression tests for filtering, visibility, metadata resilience, and pagination.
- Corrected the production audit harness to scope Vercel automation bypass to a first-party cookie, preventing false third-party CORS failures, and added the discovery docs to its route matrix.
- Fixed the settlement-history chart's mobile flex sizing so growing day counts cannot push the Traction page beyond the viewport.

## 2026-08-12 — Public connector security and quality gate

- Blocked server-side requests from RSS, PeerTube, Owncast, Navidrome, and partner x402 probes to loopback, private, link-local, reserved, and cloud-metadata destinations.
- Applied the same validation to every redirect hop and rejected unsafe protocols and credential-bearing URLs.
- Added regression coverage for the outbound URL boundary.
- Paginated Creator Studio's citable-resource gallery to prevent large catalogs from triggering a badge-request storm and rate-limit errors.
- Made Solidity formatting a real failing lint gate instead of suppressing formatter failures, then normalized the existing contracts.
- Added this reviewer-facing changelog to the README and live documentation.
- Re-ran the 32-route desktop/mobile production audit with safe click coverage: zero first-party defects.

## 2026-07-19 — Paying-agent metric integrity

- Fixed the landing-page payer count to derive from settled receipts instead of accruals, removing a stale value that could remain frozen at one.
- Commit: [048a3b4](https://github.com/Franlinozz/Sluice/commit/048a3b4)

## 2026-07-18 — RPC and transaction-state resilience

- Added ordered Arc RPC fallback across chain reads and wallet state.
- Reduced redundant request volume with cache/deduplication and longer polling intervals.
- Preserved broadcast transactions through receipt-polling failures and surfaced an honest confirming state instead of misreporting failure.
- Commit: [770977b](https://github.com/Franlinozz/Sluice/commit/770977b)

## 2026-07-09 — User-funded citation payments

- Added a two-phase EIP-3009 flow so a connected human can fund an Ask citation directly from their wallet while the operator relays gas.
- Bound the browser signature to the server-selected source, exact amount, creator wallet, nonce, and expiry.
- Corrected the first-run creator link and clarified the paying-agent label.
- Commits: [c02ec9e](https://github.com/Franlinozz/Sluice/commit/c02ec9e), [4e776eb](https://github.com/Franlinozz/Sluice/commit/4e776eb)

## 2026-07-08 — Creator conversion and identity attribution

- Let newly registered creator sources enter the citation candidate window and unified the definition of “creator earning” across product surfaces.
- Captured and displayed the real Reown sign-in medium (Google, X, Discord, GitHub, Apple, email, or wallet), leaving legacy records unknown rather than guessing.
- Commits: [13e6ba1](https://github.com/Franlinozz/Sluice/commit/13e6ba1), [16579f4](https://github.com/Franlinozz/Sluice/commit/16579f4)

## 2026-07-07 — Creator payout correctness and reviewer UX

- Routed creator registrations to their own wallet and made profile creation explicit.
- Corrected the creator count, exposed Traction in primary navigation, and refreshed reviewer screenshots.
- Paginated the immutable settlements explorer to keep long histories usable.
- Commits: [436c3ae](https://github.com/Franlinozz/Sluice/commit/436c3ae), [c56c4c1](https://github.com/Franlinozz/Sluice/commit/c56c4c1), [3ec6414](https://github.com/Franlinozz/Sluice/commit/3ec6414)

## Submission baseline — 2026-07-07

The baseline included the metering and Gateway settlement core, paying agent, citation toll, streaming proof-of-flow, creator profiles and traction, royalty splits, reputation bonds, quadratic funding, Treasury withdrawals, SDK, MCP server, documentation, whitepaper, end-to-end Arc evidence, and the production audit harness.

- Baseline: [49b0f14](https://github.com/Franlinozz/Sluice/commit/49b0f146ad2c3c42aa1e084961da83184daf46e1)
- Complete post-submission comparison: [49b0f14…main](https://github.com/Franlinozz/Sluice/compare/49b0f146ad2c3c42aa1e084961da83184daf46e1...main)

### 2026-07-06 — Overhaul R0–R6 · Brand, motion, comprehension, traction, trust artifacts

- Zero-defect audit gate: Playwright site crawler (console/network/screenshots/links/overflow) must pass before any phase closes.
- Brand v2: Michroma wordmark, canonical public brand assets, glacial flow accent, halftone depth layer, Cards v2.
- Motion system (CSS/rAF only, reduced-motion safe) and the living-logo landing hero drawn from real receipts.
- Comprehension layer: guided tour over real surfaces, first-run checklist, plain-language glossary.
- People and traction (one profile = one human): profiles with wallet clustering, Community, Traction, Join, and partner x402 endpoints probed before listing.
- Trust artifacts: hand-built architecture diagram, whitepaper v2, rebuilt README, and documentation on traction counting and testnet versus mainnet.

### 2026-06-25 — Phase 8 · Docs and trust artifacts

- Documentation site with search, scroll-spy, previous/next navigation, and reading progress.
- Whitepaper PDF with current payments context.
- Original changelog and FAQ.

### 2026-06-25 — Phase 7 · SDK and MCP

- @sluice/pay: one-call x402 payments with deposit awareness, budget enforcement, and reasoning hooks.
- Sluice MCP: resource discovery, pricing, payment, receipts, and registration tools.
- Verified both paths with real testnet nanopayments.

### 2026-06-24 — Phases 4–6 · Product surfaces and settlement primitives

- Cinematic landing with real stats and receipt verification.
- ERC-8004 identity/reputation, BondEscrow, Bazaar, and Treasury withdrawals.
- Per-second metering with proof-of-flow auto-pause.

### 2026-06-23 — Phases 0–3 · Foundation, Meter, agent, and citation toll

- pnpm monorepo, Graphite design system, SSR-safe wallet, and console shell.
- The Meter and Circle Gateway settlement, paying agent, citation toll, and royalty splits.
- RSS connector, RSL and llms.txt generators, and the embeddable earned badge.
