# Sluice — submission

**The settlement layer for the agent-paid web.** Make the smallest unit of value sellable — a read,
a second, a citation, a listen, a call — metered and settled on **Arc** in USDC via **Circle
Gateway**. Humans and agents pay per use; creators get paid per use.

- **Live app:** https://sluice-six.vercel.app
- **Docs:** https://sluice-six.vercel.app/docs · **Whitepaper:** https://sluice-six.vercel.app/sluice-whitepaper.pdf
- **Repo:** https://github.com/Franlinozz/Sluice
- **API:** http://62.171.182.75:3001 · **Network:** Arc testnet (chain 5042002)

## What's real (verifiable on Arcscan)

Everything is real on Arc testnet — no mock data, no vanity counters.

- **Settlement:** Circle Gateway batches nanopayments gas-free; each payment carries a Circle
  transfer ID. On-chain anchors: deposits, withdrawals, royalty splits, reputation bonds.
- **Contracts (deployed + verified on Arcscan):**
  - IdentityRegistry `0x8e856716d653db35eb4dac7616648172cebeba34`
  - ReputationRegistry `0x6593cd1eb1dec37797aee650d48ad2f4d910cbd4`
  - BondEscrow `0x1bf29623c8a74c13bc4e27bbe72037a24976c0c1`
- **Sample real transactions:**
  - Same-chain Treasury withdrawal (Arc instant mint): `0x78bfccecdcb2c61b2748dd81028a281e3cd007caefaf7ae9e1646c42413673da`
  - **Cross-chain** withdrawal (Arc → Base Sepolia mint): `0xa6e27ea615e2e4bea4b3a6c84faada659a96a8aad22e1b649b7aa828948b677c`
- **Reputation bonds:** provider self-bonds USDC; underdelivery slashes it to the buyer (real value
  transfer), delivery releases it; ERC-8004 feedback recorded on resolution.

## Demo walkthrough (< 3 min)

1. **Landing (0:00)** — thesis, live REAL stats (settled / units / creators paid), "watch the
   economy" (pulses = real settlements), and "don't trust — verify" with a real Circle transfer ID.
2. **Earn (0:30)** — Creator Studio: register/price a resource; citable sources, RSL + llms.txt +
   earned badge.
3. **Ask (1:00)** — ask the research agent; it pays each cited source a real nanopayment (the
   citation toll) and returns a grounded answer.
4. **Settlements (1:30)** — the citation payments appear as real receipts.
5. **Streams (1:50)** — start a per-second session; watch value accrue; "simulate flow loss" →
   auto-pause (no dead-air charge); stop → real settlement.
6. **Bazaar + Agents (2:15)** — broker a match (provider self-bonds real USDC); slash on
   underdelivery → buyer compensated; reputation updates on-chain.
7. **Treasury (2:40)** — withdraw earnings: instant on Arc, or cross-chain to Base Sepolia; open the
   real mint tx on the explorer.

## Build on it

```bash
# Pay any Sluice/x402 resource in one call
pnpm add @sluice/pay
```
```ts
const sluice = new SluicePay({ privateKey });
const [r] = await sluice.discover();
const { amount } = await sluice.pay(r.id, { maxAmount: 0.01, reason: "ground my answer" });
```
MCP server (`@sluice/mcp`) exposes `discover_resources`, `get_price`, `pay_resource`,
`get_receipts`, `register_resource` to Claude Code / Cursor / Codex. See `/docs/mcp`.

## No-dead-controls checklist

Every interactive control either works or is visibly disabled with a reason. ✅ = verified.

| Route | Controls | Status |
| --- | --- | --- |
| `/` landing | CTAs (Start earning, Run a paying agent, Open console), footer links, whitepaper, AskBox, ⌘ live stats refresh | ✅ all route / act |
| `/app` overview | KPI cards, nav, auto-refresh | ✅ |
| `/app/earn` | register resource, RSS ingest, RSL/llms.txt/badge links, splitter link | ✅ |
| `/ask` | ask form, sample prompts → real research + citation toll | ✅ |
| `/app/spend` | run agent, budget controls, live trace | ✅ |
| `/app/meter` + `/[id]` | start session, pause/resume/stop, simulate flow loss, heartbeat | ✅ real |
| `/app/discover` | search, filters, per-resource actions, Broker form | ✅ |
| `/app/agents` | reputation, bond ledger, Release / Slash (active only) | ✅ real txs |
| `/app/treasury` | balance, Withdraw (amount/chain/recipient), real mint | ✅ |
| `/app/settlements` | receipt list, verify links | ✅ |
| `/docs/*` | sidebar, ⌘K search, scroll-spy TOC, prev/next, copy code, whitepaper | ✅ |

## Honesty (live / testnet / beta / roadmap)

- **Live:** meter, paying agent, citation toll, royalty splits, streaming + proof-of-flow,
  reputation bonds, Bazaar, Treasury, SDK, MCP, docs.
- **Testnet:** Arc testnet with real test USDC; settlement code is network-agnostic.
- **Beta:** cross-chain withdrawals require native gas on the destination chain (pre-flighted).
- **Roadmap:** more connectors, mainnet, wallet-driven self-service deposit/withdraw.

## Security

- No secrets in the client bundle (only `NEXT_PUBLIC_` API/APP URLs + Reown projectId).
- Public API rate-limited (240/min global; 20/min on money-moving routes).
- All agent inputs validated before any payment; decimals handled as bigint base units.

## QA notes

- Full journey verified end-to-end on Arc with real settlement (Arcscan-verifiable).
- All web routes return 200; reduced-motion paths on every animation.
- Not run here: Lighthouse (no headless Chrome in the build env) — structurally optimized (SSR,
  fixed media heights, no layout shift, client islands seeded from server data).
- The hackathon submission form must be filed by the maintainer (no programmatic access).
