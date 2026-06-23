# Sluice

**The settlement layer for the agent-paid web.** · Arc · Circle · x402 · Gateway Nanopayments

Any unit of value — a read, a second, a citation, a listen, an API call — metered and settled on
**Arc** in USDC. Creators get paid per use; agents pay per use, and decide for themselves. The hero
use case: AI research agents that pay creators **per citation** — the open, creator-owned
alternative to pay-per-crawl schemes that declare terms but never settle.

> Read [`CLAUDE.md`](./CLAUDE.md) first — it holds the verified Arc constants, pinned versions, the
> exact payment flow, and the non-negotiable rules (no fake data, no dead controls, decimals
> discipline, network-agnostic settlement).

## Monorepo layout (pnpm workspaces)

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 16 (App Router, TS strict, Tailwind v4): public site, `/app` console, `/docs`, x402-protected endpoints. Deploys to **Vercel**. |
| `apps/api` | Fastify: the Meter (accrual engine), batch-settlement timers, connector webhooks. Runs on the **VPS** (pm2). |
| `apps/agent` | Buyer/broker agent runtime. Runs on the VPS. |
| `packages/chain` | Network-agnostic Arc interface — the single source for chain id, RPC (ordered fallback), and addresses. |
| `packages/money` | The one money helper — 6-dp USDC base units (bigint), parse/format, bigint-safe JSON. |
| `packages/ui` | The "Graphite" design system: tokens, self-hosted fonts, primitives. |
| `packages/contracts` | Foundry (ERC-8004, RoyaltySplitter, Bond/Escrow) — stubs for now. |

## Quickstart

```bash
pnpm install
cp .env.example .env.local   # then fill in NEXT_PUBLIC_REOWN_PROJECT_ID (free: cloud.reown.com)
pnpm dev                      # runs web (:3000) + api (:3001)
```

- Design-system sign-off surface: `/app/_dev/tokens`
- Console: `/app` · Landing: `/` · Docs: `/docs`

```bash
pnpm typecheck   # all workspaces
pnpm test        # unit tests (money, chain)
pnpm build       # production build of apps/web
```

## Verified Arc Testnet constants

- Chain ID `5042002` · CAIP-2 `eip155:5042002` · RPC `https://rpc.testnet.arc.network`
- Explorer `https://testnet.arcscan.app` · native gas token: USDC (18-dp display)
- USDC token (payments, 6-dp): `0x3600000000000000000000000000000000000000`
- Gateway Wallet contract: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`

Built on Circle's reference plumbing ([`circlefin/arc-nanopayments`](https://github.com/circlefin/arc-nanopayments)).
