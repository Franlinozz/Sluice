/**
 * Smoke test: spin up the Sluice MCP server over stdio and exercise it like a real MCP client —
 * list tools, discover resources, PAY one (real nanopayment on Arc), then read the receipts.
 *
 *   SLUICE_API=http://127.0.0.1:3001 SLUICE_PRIVATE_KEY=0x... \
 *     pnpm --filter @sluice/mcp exec tsx scripts/smoke.mts
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "tsx",
  args: ["src/index.ts"],
  env: process.env as Record<string, string>,
});
const client = new Client({ name: "sluice-smoke", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));

const disc = await client.callTool({ name: "discover_resources", arguments: {} });
const list = JSON.parse((disc.content as { text: string }[])[0]!.text) as { id: string; name: string; unit: string }[];
console.log(`discovered ${list.length} resources`);
const target = list.find((r) => r.unit === "per_request") ?? list[0]!;
console.log("paying for:", target.name, `(${target.id})`);

const pay = await client.callTool({
  name: "pay_resource",
  arguments: { resourceId: target.id, maxAmount: 0.05, reason: "mcp smoke test" },
});
console.log("pay result:", (pay.content as { text: string }[])[0]!.text.slice(0, 220));
if (pay.isError) throw new Error("pay_resource failed");

const rec = await client.callTool({ name: "get_receipts", arguments: { limit: 1 } });
const receipts = JSON.parse((rec.content as { text: string }[])[0]!.text) as { formattedAmount: string; status: string }[];
console.log("latest receipt:", receipts[0]?.formattedAmount, receipts[0]?.status);

await client.close();
console.log("✅ MCP discover → pay → receipt OK");
