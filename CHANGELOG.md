# Changelog

All dates are when the work shipped to Arc testnet + production. Every entry is real.

## 2026-07-06 — Overhaul R0–R6 · Brand, motion, comprehension, traction, trust artifacts
- Zero-defect audit gate: Playwright site crawler (console/network/screenshots/links/overflow) must pass before any phase closes.
- Brand v2: Michroma wordmark, canonical `/public/brand` assets, glacial "flow" accent, halftone depth layer, Cards v2.
- Motion system (CSS/rAF only, reduced-motion safe) + the living-logo landing hero drawn from real receipts.
- Comprehension layer: guided tour over real surfaces, first-run checklist, plain-language glossary.
- People & traction (one profile = one human): profiles with wallet clustering, `/community`, `/traction`, `/join`,
  partner x402 endpoints (402-probed before listing) with a proven cross-team settlement.
- Trust artifacts: hand-built architecture diagram (dark + light SVG), whitepaper v2 (brand typography, linked TOC,
  every page visually verified), rebuilt README, docs FAQ on traction counting and testnet vs mainnet.

## 2026-06-25 — Phase 8 · Docs & trust artifacts
- Documentation site at `/docs` (sidebar, ⌘K search, scroll-spy TOC, prev/next, reading progress).
- Whitepaper PDF (`/sluice-whitepaper.pdf`) — real 2026 context only (Pay Per Crawl, RSL 1.0).
- Changelog + FAQ.

## 2026-06-25 — Phase 7 · SDK & MCP
- `@sluice/pay`: one-call x402 payments, deposit-aware, budget + reasoning hooks.
- `@sluice/mcp`: MCP server (discover_resources, get_price, pay_resource, get_receipts, register_resource).
- Verified with real $0.001 nanopayments via both the SDK example and an MCP client.

## 2026-06-24 — Phase 6 · Cinematic landing
- Public landing: canvas meter, live real stats, "watch the economy" from real settlements, verify-the-receipt.

## 2026-06-24 — Phase 5 · Reputation bonds, Bazaar & Treasury
- ERC-8004 Identity/Reputation + BondEscrow deployed and verified on Arcscan.
- Broker: post → slash / release; ERC-8004 feedback on resolution.
- Bazaar (`/app/discover`); real Treasury withdrawals — instant Arc mint + cross-chain to Base Sepolia.

## 2026-06-24 — Phase 4 · Streaming meter
- Per-second metering with proof-of-flow auto-pause (no charge for dead air); real settlement on stop.

## 2026-06-23 — Phases 1–3 · Meter, agent & citation toll
- The Meter + Circle Gateway settlement; the paying agent; the citation toll with on-chain royalty splits.
- RSS connector; RSL / llms.txt generators; embeddable earned badge.

## 2026-06-23 — Phase 0 · Foundation
- pnpm monorepo, Graphite design system, SSR-safe Reown/wagmi wallet, the console shell.
