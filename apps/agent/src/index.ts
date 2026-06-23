/**
 * Sluice agent runtime — Phase 0 stub.
 * Later: budget-bound buyer agent (reason → pay via x402 → trace + ROI) and the broker/router
 * agent that posts ERC-8004 reputation bonds. Without OPENAI_API_KEY it runs deterministic mock.
 */
import { arcConfig } from "@sluice/chain";
import { formatUSD } from "@sluice/money";

const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

async function main(): Promise<void> {
  console.log("[sluice-agent] runtime stub");
  console.log(`[sluice-agent] network: ${arcConfig.caip2} (chainId ${arcConfig.chainId})`);
  console.log(
    `[sluice-agent] mode: ${hasOpenAI ? "live (OpenAI key present)" : "deterministic mock (no OPENAI_API_KEY)"}`,
  );
  console.log(`[sluice-agent] money helper smoke: smallest unit = ${formatUSD(1n)}`);
  console.log("[sluice-agent] buyer/broker agents arrive in the Agent phase.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
