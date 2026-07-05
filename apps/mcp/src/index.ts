#!/usr/bin/env -S npx -y tsx
/**
 * Sluice MCP server — lets any MCP-capable agent (Claude Code, Cursor, Codex) transact through
 * Sluice natively: discover priced resources, check prices, PAY for them on Arc (real x402
 * nanopayments via @sluice/pay), read receipts, and register new resources.
 *
 * Run:  SLUICE_API=https://sluiceflow.vercel.app/gw SLUICE_PRIVATE_KEY=0x... pnpm --filter @sluice/mcp start
 * Wire into an MCP client (e.g. Claude Code) as a stdio server pointing at this command.
 *
 * Payments are REAL (CLAUDE.md: no fakes) and require SLUICE_PRIVATE_KEY (the agent's wallet).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SluicePay, DEFAULT_API_BASE } from "@sluice/pay";

const apiBase = (process.env.SLUICE_API ?? DEFAULT_API_BASE).replace(/\/$/, "");
const pk = (process.env.SLUICE_PRIVATE_KEY ??
  process.env.BUYER_PRIVATE_KEY ??
  process.env.ARC_WALLET_PRIVATE_KEY) as `0x${string}` | undefined;

const sluice = pk ? new SluicePay({ privateKey: pk, apiBase }) : null;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };
const text = (obj: unknown): ToolResult => ({
  content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }],
});
const fail = (msg: string): ToolResult => ({ content: [{ type: "text", text: msg }], isError: true });

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${apiBase}${path}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`Sluice API ${r.status} for ${path}`);
  return (await r.json()) as T;
}

const server = new McpServer({ name: "sluice", version: "0.1.0" });

server.registerTool(
  "discover_resources",
  {
    title: "Discover Sluice resources",
    description: "List priced, x402-protected resources in the Sluice registry (id, name, unit, price).",
    inputSchema: {},
  },
  async () => {
    try {
      const rows = await getJSON<Record<string, unknown>[]>("/resources");
      const out = rows.map((r) => ({
        id: r.id,
        name: r.name,
        unit: r.unitType,
        price: r.formattedPrice,
        description: r.description,
        payTo: r.payTo,
      }));
      return text(out);
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
  },
);

server.registerTool(
  "get_price",
  {
    title: "Get resource price",
    description: "Get the unit type and price of a Sluice resource by id.",
    inputSchema: { resourceId: z.string().describe("Resource id from discover_resources") },
  },
  async ({ resourceId }) => {
    try {
      const r = await getJSON<Record<string, unknown>>(`/resources/${resourceId}`);
      return text({ id: r.id, name: r.name, unit: r.unitType, price: r.formattedPrice, unitPriceBase: r.unitPrice });
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
  },
);

server.registerTool(
  "pay_resource",
  {
    title: "Pay a Sluice resource",
    description:
      "Pay for an x402-protected Sluice resource on Arc (a real nanopayment, settled by Circle Gateway). Returns the resource response and the amount paid. Requires SLUICE_PRIVATE_KEY.",
    inputSchema: {
      resourceId: z.string().describe("Resource id (or absolute /paid URL) to pay for"),
      maxAmount: z.number().optional().describe("Per-call ceiling in USDC; abort if the price exceeds it"),
      reason: z.string().optional().describe("Why the agent is paying (audit trail)"),
    },
  },
  async ({ resourceId, maxAmount, reason }) => {
    if (!sluice) return fail("No wallet configured. Set SLUICE_PRIVATE_KEY to enable payments.");
    try {
      const res = await sluice.pay(resourceId, { maxAmount, reason });
      return text({ paid: true, amount: res.amount, resource: res.resource?.name ?? resourceId, data: res.data });
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
  },
);

server.registerTool(
  "get_receipts",
  {
    title: "Get settlement receipts",
    description: "Read recent Sluice settlement receipts (amount, unit, status, Circle settlement refs).",
    inputSchema: { limit: z.number().optional().describe("Max receipts to return (default 10)") },
  },
  async ({ limit }) => {
    try {
      const rows = await getJSON<Record<string, unknown>[]>("/receipts");
      return text(rows.slice(0, limit ?? 10));
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
  },
);

server.registerTool(
  "register_resource",
  {
    title: "Register a Sluice resource",
    description: "Register a new priced, x402-protected resource in the Sluice registry.",
    inputSchema: {
      name: z.string(),
      unitType: z
        .enum([
          "per_request",
          "per_citation",
          "per_read",
          "per_crawl",
          "per_second",
          "per_byte",
          "per_token",
          "per_listen",
          "per_view",
        ])
        .describe("How usage is metered"),
      price: z.string().describe('Human price per unit, e.g. "$0.001" or "0.000001"'),
      path: z.string().describe("URL slug for the protected endpoint (unique)"),
      description: z.string().optional(),
      payTo: z.string().optional().describe("Seller address to receive settlement"),
      author: z.string().optional(),
      contentUrl: z.string().optional(),
    },
  },
  async (args) => {
    try {
      const r = await fetch(`${apiBase}/resources`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args),
      });
      const data = await r.json();
      if (!r.ok) return fail((data as { error?: string }).error ?? `register failed (${r.status})`);
      return text({ registered: true, resource: data });
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr is safe for logs; stdout is the MCP transport.
console.error(`Sluice MCP server ready · registry ${apiBase} · wallet ${sluice ? sluice.address : "(none — read-only)"}`);
