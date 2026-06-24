# @sluice/pay

Pay any **Sluice / x402** resource on Arc in one call. Wraps Circle's `GatewayClient` (gas-free
batched nanopayments) and the Sluice registry, with **budget + reasoning guards** and
**deposit-aware** balance checks. Every payment is real — a signed x402 authorization settled by
Circle Gateway.

## Install

```bash
pnpm add @sluice/pay
```

## Quickstart (10 lines → a real nanopayment)

```ts
import { SluicePay } from "@sluice/pay";

const sluice = new SluicePay({ privateKey: process.env.PK as `0x${string}` });

const resources = await sluice.discover();           // browse the registry
const resource = resources.find((r) => r.unitType === "per_request")!;

const { data, amount } = await sluice.pay(resource.id, {
  maxAmount: 0.05,                                    // per-call ceiling (USDC)
  reason: "ground my answer",                         // audit trail
});

console.log(`paid ${amount} USDC for "${resource.name}"`, data);
```

## Budget + reasoning hooks

```ts
const sluice = new SluicePay({ privateKey, budget: 0.50 }); // cumulative cap across all pay() calls

await sluice.pay(id, {
  maxAmount: 0.01,
  onDecision: async ({ formattedPrice, resource }) => {
    // return false (or throw) to abort before any money moves
    return Number(resource?.unitPrice ?? 0) <= 10_000; // ≤ $0.01
  },
});
```

## Deposit-aware

`pay()` checks your Gateway balance first and fails with an actionable error instead of a revert.
Pass `autoDeposit: true` to top up the shortfall automatically, or deposit explicitly:

```ts
await sluice.deposit("1.00");          // deposit 1 USDC into the Gateway
const bal = await sluice.balance();    // { available, formattedAvailable, ... }
```

## API

| Method | Description |
| --- | --- |
| `discover()` | List all priced resources in the registry. |
| `getResource(id)` / `getPrice(id)` | Resolve one resource / its unit price. |
| `balance()` | Gateway balance for the payer (deposit-aware). |
| `deposit(amountUsdc)` | Deposit USDC into the Gateway; returns the tx hash. |
| `pay(idOrUrl, params)` | Pay a resource (real x402). Enforces `maxAmount`, `budget`, deposit, `onDecision`. |
| `receipts()` | Recent settlement receipts. |
| `totalSpent()` | USDC spent across all `pay()` calls (base units). |

Config: `new SluicePay({ privateKey, chain?, apiBase?, budget?, autoDeposit? })`. `apiBase` defaults
to the public Sluice API; point it at your own toll sidecar to sell your own resources.
