# Changelog

All dates are when the work shipped to Arc testnet + production. Every entry is real.

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
