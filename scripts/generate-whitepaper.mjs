/**
 * Generates the Sluice whitepaper PDF (pure JS via pdfkit — no system deps).
 * Output: apps/web/public/sluice-whitepaper.pdf  (served at /sluice-whitepaper.pdf)
 *
 * Cites only real, current (2025–2026) facts: Cloudflare Pay Per Crawl, RSL 1.0, Circle Gateway,
 * x402, ERC-8004. No invented figures.
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

const INK = "#16181d";
const MUTED = "#4b5159";
const FAINT = "#8a9099";
const HAIR = "#dfe2e6";
const ACCENT = "#0b0c0e";
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

function ensure(space) {
  if (doc.y + space > BOTTOM) doc.addPage();
}
function h1(text) {
  ensure(60);
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(15).fillColor(ACCENT).text(text, { width: W });
  doc.moveTo(M, doc.y + 4).lineTo(M + W, doc.y + 4).lineWidth(0.5).strokeColor(HAIR).stroke();
  doc.moveDown(0.6);
}
function h2(text) {
  ensure(40);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(text, { width: W });
  doc.moveDown(0.2);
}
function para(text) {
  ensure(28);
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(text, { width: W, align: "left", lineGap: 2.5 });
  doc.moveDown(0.5);
}
function bullet(text) {
  ensure(22);
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`•  ${text}`, { width: W, indent: 8, lineGap: 2 });
  doc.moveDown(0.25);
}
function code(text) {
  const lines = text.split("\n");
  const h = lines.length * 12 + 16;
  ensure(h + 8);
  const y = doc.y;
  doc.roundedRect(M, y, W, h, 4).fillColor(CODEBG).fill();
  doc.font("Courier").fontSize(8.5).fillColor(INK).text(text, M + 12, y + 8, { width: W - 24, lineGap: 2 });
  doc.y = y + h + 8;
}

// ── Cover ──────────────────────────────────────────────────────
doc.y = 150;
doc.font("Helvetica-Bold").fontSize(34).fillColor(ACCENT).text("Sluice", { width: W });
doc.moveDown(0.2);
doc.font("Helvetica").fontSize(15).fillColor(MUTED).text("A settlement layer for the agent-paid web.", { width: W });
doc.moveDown(2);
doc.moveTo(M, doc.y).lineTo(M + W, doc.y).lineWidth(0.5).strokeColor(HAIR).stroke();
doc.moveDown(1);
doc.font("Helvetica").fontSize(10.5).fillColor(MUTED).text(
  "Make the smallest unit of value sellable — a read, a second, a citation, a listen, a call — metered and settled on Arc in USDC. For humans and machines.",
  { width: W, lineGap: 3 },
);
doc.moveDown(3);
doc.font("Helvetica").fontSize(9).fillColor(FAINT).text("Arc · Circle Gateway · x402 · ERC-8004", { width: W });
doc.font("Helvetica").fontSize(9).fillColor(FAINT).text("June 2026 · Testnet reference implementation", { width: W });
doc.addPage();

// ── Abstract ───────────────────────────────────────────────────
h1("Abstract");
para(
  "The open web is being read, at scale, by machines that rarely pay or refer traffic back. New standards have emerged to declare terms — Cloudflare's Pay Per Crawl and the Really Simple Licensing (RSL) standard — but declaring a price is not the same as collecting it. Sluice is the missing settlement layer: it wraps any resource behind an x402 paywall, meters usage in any unit, and settles batched nanopayments gas-free through Circle Gateway on Arc. Payment and attribution become the same event. Reputation becomes capital at risk, recorded on-chain. The result is an open toll booth for the long tail — creator-owned, agent-payable, and verifiable.",
);

// ── 1. The problem ─────────────────────────────────────────────
h1("1. The problem: read everywhere, paid nowhere");
para(
  "By 2025, AI crawlers had become a dominant source of automated traffic, while sending comparatively little referral traffic back to the sites they learn from. Cloudflare's own 2025 reporting highlighted how lopsided the crawl-to-referral relationship had become for AI bots relative to traditional search — orders of magnitude more pages scraped than visitors returned.",
);
para(
  "The ecosystem responded with mechanisms to state terms. Cloudflare's Pay Per Crawl (introduced 2025) lets publishers charge AI crawlers per request using the HTTP 402 'Payment Required' status. The Really Simple Licensing standard (RSL 1.0, 2025), backed by major publishers, extends robots.txt and sitemaps with machine-readable licensing and royalty terms — free, subscription, per-crawl, or per-inference.",
);
para(
  "These are real progress, but they largely standardize the declaration of terms. The harder half is settlement: collecting micro-amounts, across many counterparties, at sub-cent granularity, without gas eating the payment — and doing it for machines that transact autonomously. That is the gap Sluice fills.",
);

// ── 2. The Meter ───────────────────────────────────────────────
h1("2. The Meter: one mechanism, every unit");
para(
  "Sluice meters value in whatever unit a resource is naturally consumed: per request, per read, per crawl, per citation, per second, per byte, per token, per listen, per view. A payer signs an x402 authorization against the Gateway Wallet; usage accrues per unit and is batched into settlement.",
);
h2("Decimals discipline");
para(
  "Payment USDC is six-decimal and handled exclusively as integer base units — never floating point. Native Arc gas is eighteen-decimal and tracked separately. The two are never coerced into one another, eliminating an entire class of rounding and precision bugs.",
);
code('rate × units → accrued (6dp base units, bigint)\nbatch → Circle Gateway → settled receipt');

// ── 3. Settlement ──────────────────────────────────────────────
h1("3. Settlement: gas-free, batched, anchored");
para(
  "Circle Gateway settles batched nanopayments via an attested ledger, so individual payments do not each burn gas. Each settlement carries a Circle transfer identifier rather than a per-payment transaction hash. Funds touch the chain at well-defined anchors: the depositor's deposit into the Gateway Wallet, and the recipient's withdrawal — a Gateway Minter mint, instant on Arc or cross-chain to other testnets. Royalty splits and reputation bonds are additional on-chain anchors. All are independently verifiable on Arcscan.",
);
para(
  "Authorizations are EIP-3009 style and signed for long validity windows so batched settlement remains valid; the platform settles on a timer and a reconciler resolves each Circle transfer to a confirmed receipt.",
);

// ── 4. Proof-of-Flow ───────────────────────────────────────────
h1("4. Proof-of-Flow: honest streaming");
para(
  "For continuous resources, the payer approves a rate and a reserve cap. The meter accrues lazily — frozen accrued time plus a live flowing delta, capped at the reserve. A lightweight heartbeat proves delivery. If the heartbeat goes stale, the meter auto-pauses and freezes accrual at the last good heartbeat, not at detection time, so dead air is never billed. When delivery resumes, so does the meter. On stop, only the flowed whole seconds settle; unused reserve is simply never charged.",
);

// ── 5. The Citation Toll ───────────────────────────────────────
h1("5. The Citation Toll: payment is the citation");
para(
  "When a research agent grounds an answer on a source, it pays that source to retrieve it. The payment is the citation — the same event serves attribution and compensation, and both are auditable. Single-author resources settle gas-free via Gateway. Multi-author resources deploy a per-resource RoyaltySplitter contract that fans the payment out by share on-chain, with the final payee absorbing rounding dust so the split is exact.",
);

// ── 6. Reputation bonds ────────────────────────────────────────
h1("6. Reputation as capital at risk");
para(
  "Star ratings are cheap to fabricate; staked capital is not. In Sluice, a provider self-bonds USDC behind a job. On delivery the bond is released; on underdelivery an arbiter slashes it to the harmed buyer. A minimal ERC-8004 Identity and Reputation registry pairs each provider with an on-chain identity and records feedback on resolution. The bond contract's running totals — bonded, active, slashed, released — are the reputation: a fact you can read as money rather than a score you must trust.",
);

// ── 7. Architecture ────────────────────────────────────────────
h1("7. Architecture & developer surface");
bullet("Registry + paywall: any resource becomes an x402-protected, priced endpoint.");
bullet("@sluice/pay SDK: one-call payment, deposit-aware, with budget and reasoning hooks.");
bullet("MCP server: discover / price / pay / receipts / register as native agent tools.");
bullet("RSL + llms.txt: declares terms in the emerging standards; Sluice is the settlement that honors them.");
bullet("Self-hostable toll sidecar: creator-owned, settle to your own wallet, no platform lock-in.");
doc.moveDown(0.3);
code('const sluice = new SluicePay({ privateKey });\nconst { amount } = await sluice.pay(resourceId, { maxAmount: 0.01 });');

// ── 8. Conclusion ──────────────────────────────────────────────
h1("8. Conclusion");
para(
  "Standards now let the web declare what access costs. Sluice makes that price collectible — at sub-cent granularity, gas-free, for humans and autonomous agents alike, with attribution and reputation built in. It turns the long tail of content into an addressable, payable surface, and gives the agent economy a settlement layer it can build on.",
);

// ── References ─────────────────────────────────────────────────
h1("References");
const refs = [
  "Cloudflare. Introducing pay per crawl: enabling content owners to charge AI crawlers (2025).",
  "RSL Collective. Really Simple Licensing (RSL) 1.0 standard — rslstandard.org (2025).",
  "Circle. Gateway documentation — developers.circle.com/gateway.",
  "x402 — an open payments standard over HTTP 402 — x402.org.",
  "ERC-8004: Trustless Agents — Ethereum ERC draft (2025).",
  "Circle. Arc — an open Layer-1 for stablecoin finance.",
];
refs.forEach((r, i) => {
  ensure(20);
  doc.font("Helvetica").fontSize(8.5).fillColor(FAINT).text(`[${i + 1}]  ${r}`, { width: W, lineGap: 1.5 });
  doc.moveDown(0.2);
});

// ── Footer page numbers ────────────────────────────────────────
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  doc.font("Helvetica").fontSize(8).fillColor(FAINT);
  doc.text(`Sluice whitepaper · ${i + 1}/${range.count}`, M, doc.page.height - 40, { width: W, align: "center" });
}

doc.end();
console.log(`wrote ${out}`);
