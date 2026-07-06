/**
 * Generates the Sluice whitepaper PDF (pure JS via pdfkit — no system deps).
 * Output: apps/web/public/sluice-whitepaper.pdf  (served at /sluice-whitepaper.pdf)
 *
 * Typography = the site's Graphite stack (Space Grotesk display / Inter body / JetBrains Mono),
 * statically instanced from the self-hosted variable fonts into scripts/assets/fonts (pdfkit
 * cannot select variable-font instances). Cover uses the brand lockup from /public/brand.
 *
 * Cites only real, current (2025–2026) facts: Cloudflare Pay Per Crawl, RSL 1.0, Circle Gateway,
 * x402, ERC-8004. No invented figures. Contract addresses are the real Arc-testnet deployments.
 *
 * Rule 19: after generating, rasterize EVERY page (pdftoppm -png) and inspect each by eye.
 *
 *   node scripts/generate-whitepaper.mjs
 */
import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "apps/web/public/sluice-whitepaper.pdf");
mkdirSync(dirname(out), { recursive: true });

const F = {
  display: join(root, "scripts/assets/fonts/display-700.ttf"),
  displayMed: join(root, "scripts/assets/fonts/display-500.ttf"),
  sans: join(root, "scripts/assets/fonts/sans-400.ttf"),
  sansSemi: join(root, "scripts/assets/fonts/sans-600.ttf"),
  mono: join(root, "scripts/assets/fonts/mono-400.ttf"),
  monoSemi: join(root, "scripts/assets/fonts/mono-600.ttf"),
};

const INK = "#16181d";
const MUTED = "#4b5159";
const FAINT = "#8a9099";
const HAIR = "#dfe2e6";
const ACCENT = "#0b0c0e";
const FLOW = "#0E7490"; // the glacial accent, print-legible variant
const CODEBG = "#f4f5f7";

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 70, bottom: 64, left: 64, right: 64 },
  info: {
    Title: "Sluice — A Settlement Layer for the Agent-Paid Web",
    Author: "Sluice",
    Subject: "Per-unit value settlement on Arc via Circle Gateway",
  },
  bufferPages: true,
});
doc.pipe(createWriteStream(out));

const M = 64;
const W = doc.page.width - M * 2;
const BOTTOM = doc.page.height - 64;

const toc = []; // { title, page } — filled during generation, drawn onto the reserved TOC page

function ensure(space) {
  if (doc.y + space > BOTTOM) doc.addPage();
}
function h1(text, { toToc = true } = {}) {
  ensure(90);
  doc.moveDown(0.8);
  const dest = `s-${toc.length}`;
  if (toToc) {
    doc.addNamedDestination(dest);
    toc.push({ title: text, page: doc.bufferedPageRange().count, dest });
    doc.outline.addItem(text);
  }
  doc.font(F.display).fontSize(15).fillColor(ACCENT).text(text, { width: W });
  doc.moveTo(M, doc.y + 4).lineTo(M + W, doc.y + 4).lineWidth(0.5).strokeColor(HAIR).stroke();
  doc.moveDown(0.6);
}
function h2(text) {
  ensure(48);
  doc.moveDown(0.4);
  doc.font(F.sansSemi).fontSize(11).fillColor(INK).text(text, { width: W });
  doc.moveDown(0.2);
}
function para(text, opts = {}) {
  ensure(40);
  doc.font(F.sans).fontSize(10).fillColor(MUTED).text(text, { width: W, align: "left", lineGap: 2.5, ...opts });
  doc.moveDown(0.5);
}
function bullet(text) {
  ensure(30);
  doc.font(F.sans).fontSize(10).fillColor(MUTED).text(`•  ${text}`, { width: W, indent: 8, lineGap: 2 });
  doc.moveDown(0.25);
}
function code(text) {
  const lines = text.split("\n");
  const h = lines.length * 12 + 16;
  ensure(h + 8);
  const y = doc.y;
  doc.roundedRect(M, y, W, h, 4).fillColor(CODEBG).fill();
  doc.font(F.mono).fontSize(8.5).fillColor(INK).text(text, M + 12, y + 8, { width: W - 24, lineGap: 2 });
  doc.y = y + h + 8;
  doc.x = M;
}
function eyebrow(text) {
  doc.font(F.mono).fontSize(8.5).fillColor(FAINT).text(text.toUpperCase(), { width: W, characterSpacing: 1.4 });
}

// ── Cover ──────────────────────────────────────────────────────
eyebrow("Sluice — Whitepaper · July 2026");
doc.image(join(root, "apps/web/public/brand/logo-full-light.png"), M, 170, { width: 230 });
doc.y = 300;
doc.x = M;
doc.font(F.display).fontSize(30).fillColor(ACCENT).text("A settlement layer\nfor the agent-paid web.", { width: W, lineGap: 4 });
doc.moveDown(1.2);
doc.moveTo(M, doc.y).lineTo(M + W, doc.y).lineWidth(0.5).strokeColor(HAIR).stroke();
doc.moveDown(1);
doc.font(F.sans).fontSize(11).fillColor(MUTED).text(
  "Make the smallest unit of value sellable — a read, a second, a citation, a listen, a call — metered and settled on Arc in USDC. For humans and machines.",
  { width: W - 80, lineGap: 3.5 },
);
doc.y = 660;
doc.font(F.mono).fontSize(9).fillColor(FAINT).text("ARC · CIRCLE GATEWAY · X402 · ERC-8004", { width: W, characterSpacing: 1 });
doc.moveDown(0.4);
doc.font(F.mono).fontSize(9).fillColor(FAINT).text("Testnet reference implementation — sluiceflow.vercel.app", { width: W });

// ── Reserved TOC page (filled after content is laid out) ───────
doc.addPage();
const TOC_PAGE = doc.bufferedPageRange().count - 1;
doc.addPage();

// ── Abstract ───────────────────────────────────────────────────
h1("Abstract");
para(
  "The open web is being read, at scale, by machines that rarely pay or refer traffic back. New standards have emerged to declare terms — Cloudflare's Pay Per Crawl and the Really Simple Licensing (RSL) standard — but declaring a price is not the same as collecting it. Sluice is the missing settlement layer: it wraps any resource behind an x402 paywall, meters usage in any unit, and settles batched nanopayments gas-free through Circle Gateway on Arc. Payment and attribution become the same event. Reputation becomes capital at risk, recorded on-chain. The result is an open toll booth for the long tail — creator-owned, agent-payable, and verifiable.",
);

// ── 1. The problem ─────────────────────────────────────────────
h1("1. The problem: read everywhere, paid nowhere");
para(
  "By 2025, AI crawlers had become a dominant source of automated traffic, while sending comparatively little referral traffic back to the sites they learn from. Cloudflare's own 2025 reporting highlighted how lopsided the crawl-to-referral relationship had become for AI bots relative to traditional search — orders of magnitude more pages scraped than visitors returned. For a creator, the historical bargain of the open web (crawl me, and send me readers) is quietly dissolving.",
);
para(
  "The ecosystem responded with mechanisms to state terms. Cloudflare's Pay Per Crawl (introduced 2025) lets publishers charge AI crawlers per request using the HTTP 402 'Payment Required' status — but it settles only within Cloudflare, for Cloudflare's customers. The Really Simple Licensing standard (RSL 1.0, 2025), backed by major publishers, extends robots.txt and sitemaps with machine-readable licensing and royalty terms — free, subscription, per-crawl, or per-inference — but it is a terms layer, not a payments rail.",
);
para(
  "These are real progress, but they largely standardize the declaration of terms. The harder half is settlement: collecting micro-amounts, across many counterparties, at sub-cent granularity, without gas eating the payment — and doing it for machines that transact autonomously. That is the gap Sluice fills: an open toll booth that any creator can own, any agent can pay, and anyone can audit.",
);

// ── 2. The gap in x402 ─────────────────────────────────────────
h1("2. The gap x402 leaves: deferred, aggregated settlement");
para(
  "x402 is an elegant handshake: request a resource, receive HTTP 402 with a price, sign a payment authorization, retry, get the content. It answers 'how does a machine pay for one thing, once.' It does not answer how to charge for the ten-thousandth of a stream-second, the third citation in an answer, or a crawl priced below what any single settlement can economically carry.",
);
para(
  "Sluice's core primitive — the Meter — decouples authorization from settlement. A payer authorizes once; consumption accrues per unit in integer base units, including amounts below the settleable floor; and accruals are aggregated and settled in batches through Circle Gateway, gas-free, on a timer. The unit adapter is pluggable (per request, per read, per crawl, per citation, per second, per listen), and the settlement backend is swappable (Gateway-batched primary, direct x402 fallback) without touching accrual logic. Metering is the product; settlement is a backend.",
);
code("rate × units -> accrued (6dp base units, bigint)\nbatch -> Circle Gateway -> settled receipt (attested) -> withdraw on-chain");

// ── 3. The Meter ───────────────────────────────────────────────
h1("3. The Meter: one mechanism, every unit");
para(
  "Sluice meters value in whatever unit a resource is naturally consumed: per request, per read, per crawl, per citation, per second, per byte, per token, per listen, per view. A payer signs an x402 authorization against the Gateway Wallet; usage accrues per unit and is batched into settlement. A resource declares its unit and rate once; everything downstream — accrual, batching, receipts, badges, payouts — is shared machinery.",
);
h2("Decimals discipline");
para(
  "Payment USDC is six-decimal and handled exclusively as integer base units — never floating point. Native Arc gas is USDC displayed at eighteen decimals and tracked separately. The two are never coerced into one another, eliminating an entire class of rounding and precision bugs. Money crosses JSON boundaries as strings and is parsed back to bigint at the edge.",
);

// ── 4. Settlement ──────────────────────────────────────────────
h1("4. Settlement: gas-free, batched, anchored");
para(
  "The payment handshake follows the Gateway Nanopayments profile of x402. A 402 response carries the price and an EIP-712 domain whose verifying contract is the Circle Gateway Wallet — the buyer signs an EIP-3009 TransferWithAuthorization against the Gateway Wallet contract, not the USDC token. Circle Gateway verifies the signature in under a second, the resource is served immediately, and settlement is deferred into batches.",
);
para(
  "Circle Gateway settles those batches via an attested ledger, so individual nanopayments do not each burn gas. Each settlement carries a Circle transfer identifier rather than a per-payment transaction hash. Funds touch the chain at well-defined anchors: the depositor's one-time deposit into the Gateway Wallet, and the recipient's withdrawal — a Gateway Minter mint, instant on Arc or cross-chain. Royalty splits, reputation bonds, and funding-round sweeps are additional on-chain anchors. All are independently verifiable on Arcscan.",
);
para(
  "Authorizations are signed with long validity windows so batched settlement remains valid; the platform settles on a timer and a reconciler resolves each Circle transfer to a confirmed receipt. The UI never shows 'settled' before the batch settles: states are authorized, then batching, then settled — honestly.",
);

// ── 5. Proof-of-Flow ───────────────────────────────────────────
h1("5. Proof-of-Flow: honest streaming");
para(
  "For continuous resources, the payer approves a rate and a reserve cap. The meter accrues lazily — frozen accrued time plus a live flowing delta, capped at the reserve. A lightweight heartbeat proves delivery. If the heartbeat goes stale, the meter auto-pauses and freezes accrual at the last good heartbeat, not at detection time, so dead air is never billed. When delivery resumes, so does the meter. On stop, only the flowed whole seconds settle; unused reserve is simply never charged.",
);

// ── 6. The Citation Toll ───────────────────────────────────────
h1("6. The Citation Toll: payment is the citation");
para(
  "When a research agent grounds an answer on a source, it pays that source to retrieve it. The payment is the citation — the same event serves attribution and compensation, and both are auditable: claim, source, payment, author — one chain. Single-author resources settle gas-free via Gateway. Multi-author resources deploy a per-resource RoyaltySplitter contract that fans the payment out by share on-chain, with the final payee absorbing rounding dust so the split is exact.",
);
para(
  "This bridges the terms layer to the money layer: a resource's RSL document and llms.txt declare the license and the price; Sluice is the mechanism that actually collects it when an agent honors those terms. Creators get an embeddable badge whose earned counter is computed from real settled receipts.",
);

// ── 7. Reputation bonds ────────────────────────────────────────
h1("7. Reputation as capital at risk");
para(
  "Star ratings are cheap to fabricate; staked capital is not. In Sluice, a provider self-bonds USDC behind a job. On delivery the bond is released; on underdelivery an arbiter slashes it to the harmed buyer. A minimal ERC-8004 Identity and Reputation registry pairs each provider with an on-chain identity and records feedback on resolution. The bond contract's running totals — bonded, active, slashed, released — are the reputation: a fact you can read as money rather than a score you must trust.",
);

// ── 8. Funding the commons ─────────────────────────────────────
h1("8. Quadratic funding for the long tail");
para(
  "Toll revenue rewards what agents already consume; it does not bootstrap what should exist next. Sluice adds an on-chain funding pool with quadratic matching: many small backers move the match more than one large one (match = (sum of square roots of contributions)², minus the contributions themselves), with a conservative sybil weighting derived from on-chain identity age and activity. Tips are real transfers; the round budget is committed up front; and the round settles in a single on-chain sweep from the FundingPool contract.",
);

// ── 9. Architecture ────────────────────────────────────────────
h1("9. Architecture & developer surface");
bullet("Registry + paywall: any resource becomes an x402-protected, priced endpoint.");
bullet("The Meter: unit adapters + accrual ledger, decoupled from the settlement backend (Gateway-batched primary, direct x402 fallback).");
bullet("@sluice/pay SDK: one-call payment, deposit-aware, with budget and reasoning hooks.");
bullet("MCP server: discover / price / pay / receipts / register as native agent tools.");
bullet("RSL + llms.txt: declares terms in the emerging standards; Sluice is the settlement that honors them.");
bullet("Buyer agent: an LLM scores relevance and recommends; deterministic code enforces budget, price ceilings, and allowed units. Model output never authorizes a payment.");
bullet("Self-hostable toll sidecar: creator-owned, settle to your own wallet, no platform lock-in.");
doc.moveDown(0.3);
code('const sluice = new SluicePay({ privateKey });\nconst { formattedAmount } = await sluice.pay(resourceId, { maxAmount: 0.01 });');

// ── 10. Deployment status ──────────────────────────────────────
h1("10. Deployment status (July 2026)");
para(
  "Sluice runs live on Arc testnet (chain id 5042002) at sluiceflow.vercel.app. Every figure shown in the product traces to a real on-chain event or a real database record; there is no simulated data. The following contracts are deployed and verified on Arcscan (testnet.arcscan.app):",
);
code(
  "IdentityRegistry    0x8e856716d653db35eb4dac7616648172cebeba34\n" +
  "ReputationRegistry  0x6593cd1eb1dec37797aee650d48ad2f4d910cbd4\n" +
  "BondEscrow          0x1bf29623c8a74c13bc4e27bbe72037a24976c0c1\n" +
  "FundingPool         0xf7ef1d456e74736bbf346c29f74e28c60ce3ade8\n" +
  "RoyaltySplitter     deployed per multi-author resource\n" +
  "Circle Gateway Wallet (Arc testnet)  0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
);
para(
  "Verified end-to-end on testnet: deposits, sub-cent citation tolls, streaming sessions with proof-of-flow, on-chain royalty splits, bond post/slash/release with ERC-8004 feedback, quadratic-round sweeps, and real same-chain and cross-chain withdrawals via the Gateway Minter. Mainnet posture: Arc mainnet is announced for late 2026; Sluice's chain access is confined to one network-agnostic interface, so redeployment is a configuration change plus contract redeploys — not a rewrite.",
);

// ── 11. Conclusion ─────────────────────────────────────────────
h1("11. Conclusion");
para(
  "Standards now let the web declare what access costs. Sluice makes that price collectible — at sub-cent granularity, gas-free, for humans and autonomous agents alike, with attribution and reputation built in. It turns the long tail of content into an addressable, payable surface, and gives the agent economy a settlement layer it can build on.",
);

// ── References ─────────────────────────────────────────────────
h1("References");
const refs = [
  "Cloudflare. Introducing pay per crawl: enabling content owners to charge AI crawlers (2025).",
  "Cloudflare Radar. AI bot crawl-to-referral ratios, 2025 reporting.",
  "RSL Collective. Really Simple Licensing (RSL) 1.0 standard — rslstandard.org (2025).",
  "Circle. Gateway documentation — developers.circle.com/gateway (incl. Gateway Nanopayments).",
  "x402 — an open payments standard over HTTP 402 — x402.org.",
  "EIP-3009: Transfer With Authorization (USDC's meta-transaction standard).",
  "ERC-8004: Trustless Agents — Ethereum ERC draft (2025).",
  "Circle. Arc — an open Layer-1 for stablecoin finance — docs.arc.network.",
];
refs.forEach((r, i) => {
  ensure(20);
  doc.font(F.sans).fontSize(8.5).fillColor(FAINT).text(`[${i + 1}]  ${r}`, { width: W, lineGap: 1.5 });
  doc.moveDown(0.2);
});

// ── TOC (drawn onto the reserved page, with working links) ────
doc.switchToPage(TOC_PAGE);
doc.y = 90;
doc.x = M;
doc.font(F.display).fontSize(15).fillColor(ACCENT).text("Contents", M, 90, { width: W });
doc.moveTo(M, doc.y + 4).lineTo(M + W, doc.y + 4).lineWidth(0.5).strokeColor(HAIR).stroke();
let ty = doc.y + 28;
for (const item of toc) {
  doc.font(F.sans).fontSize(10.5).fillColor(INK).text(item.title, M, ty, { width: W - 40, goTo: item.dest });
  doc.font(F.mono).fontSize(9.5).fillColor(FAINT).text(String(item.page), M + W - 30, ty + 1, { width: 30, align: "right", goTo: item.dest });
  doc.moveTo(M, ty + 16).lineTo(M + W, ty + 16).lineWidth(0.25).strokeColor(HAIR).stroke();
  ty += 26;
}

// ── Footer page numbers (skip cover + TOC header page keeps one too) ──
const range = doc.bufferedPageRange();
for (let i = 1; i < range.count; i++) {
  doc.switchToPage(i);
  // writing inside the bottom margin auto-adds a page unless the margin is lifted first
  const keep = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.font(F.mono).fontSize(8).fillColor(FAINT);
  doc.text(`SLUICE WHITEPAPER · ${i + 1} / ${range.count}`, M, doc.page.height - 42, { width: W, align: "center", characterSpacing: 0.8 });
  doc.page.margins.bottom = keep;
}

doc.end();
console.log(`wrote ${out} (${range.count} pages)`);
