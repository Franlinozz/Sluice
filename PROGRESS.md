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

## Next: Phase 3 — citation toll + RSSHub connector + royalty splits (the hero). See CLAUDE.md.
