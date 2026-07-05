# @sluice/mcp — Sluice MCP server

Let any MCP-capable agent (**Claude Code, Cursor, Codex**) discover and pay Sluice / x402 resources
on Arc natively. Payments are real x402 nanopayments settled by Circle Gateway.

## Tools

| Tool | What it does |
| --- | --- |
| `discover_resources` | List priced resources in the Sluice registry. |
| `get_price` | Unit type + price for a resource id. |
| `pay_resource` | **Pay** an x402 resource on Arc (real nanopayment). Needs `SLUICE_PRIVATE_KEY`. |
| `get_receipts` | Recent settlement receipts. |
| `register_resource` | Register a new priced resource. |

## Run

```bash
SLUICE_API=https://sluice-six.vercel.app/gw \
SLUICE_PRIVATE_KEY=0xYOUR_AGENT_KEY \
  pnpm --filter @sluice/mcp start
```

Without `SLUICE_PRIVATE_KEY` the server still runs read-only (discover/price/receipts/register);
`pay_resource` returns an actionable error.

## Wire into Claude Code

`~/.claude/mcp.json` (or your client's MCP config):

```json
{
  "mcpServers": {
    "sluice": {
      "command": "pnpm",
      "args": ["--filter", "@sluice/mcp", "start"],
      "cwd": "/path/to/Sluice",
      "env": {
        "SLUICE_API": "https://sluice-six.vercel.app/gw",
        "SLUICE_PRIVATE_KEY": "0xYOUR_AGENT_KEY"
      }
    }
  }
}
```

Then ask your agent: *"discover Sluice resources, then pay for the Premium Quote and show me the
receipt."* It will call `discover_resources` → `pay_resource` → `get_receipts` and settle on Arc.

## Smoke test

```bash
SLUICE_API=http://127.0.0.1:3001 SLUICE_PRIVATE_KEY=0x... \
  pnpm --filter @sluice/mcp exec tsx scripts/smoke.mts
```

Built on [`@sluice/pay`](../../packages/sluice-pay). MCP transport is stdio (stdout = protocol,
stderr = logs).
