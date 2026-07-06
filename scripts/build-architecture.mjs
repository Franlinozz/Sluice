/**
 * Builds the README architecture diagram — hand-authored SVG (no Mermaid, no screenshots).
 * Every coordinate is laid out by hand on an 8px grid with explicit routing corridors;
 * this script only stamps the two theme variants from one geometry so dark/light never drift.
 *
 * Outputs:
 *   docs/diagrams/architecture-dark.svg
 *   docs/diagrams/architecture-light.svg
 *   docs/diagrams/architecture.png          (2x raster of dark)
 *   docs/diagrams/_check-dark-830.png       (830px legibility check — not committed)
 *   docs/diagrams/_check-light-830.png
 *
 *   node scripts/build-architecture.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs/diagrams");
mkdirSync(outDir, { recursive: true });

const SANS = "Inter, system-ui, -apple-system, sans-serif";
const MONO = "JetBrains Mono, ui-monospace, SFMono-Regular, monospace";

const THEMES = {
  dark: {
    bg: "#0A0A0B",
    dot: "rgba(255,255,255,0.03)",
    lane: "#0D0D0F",
    laneStroke: "rgba(255,255,255,0.05)",
    card: "#111113",
    cardStroke: "rgba(255,255,255,0.08)",
    header: "#17181B",
    hi: "#F4F5F6",
    mid: "#A7ABB2",
    low: "#6A6E76",
    structural: "#2A2C31",
    flow: "#6FE3F0",
    flowDim: "rgba(111,227,240,0.16)",
    settled: "#4ADE80",
    chipBg: "#1F2024",
    chipStroke: "rgba(255,255,255,0.10)",
    shadow: "rgba(0,0,0,0.35)",
  },
  light: {
    bg: "#FAFAFA",
    dot: "rgba(0,0,0,0.05)",
    lane: "#F1F2F4",
    laneStroke: "rgba(0,0,0,0.06)",
    card: "#FFFFFF",
    cardStroke: "rgba(0,0,0,0.12)",
    header: "#EAEBED",
    hi: "#16181D",
    mid: "#4B5159",
    low: "#7A8087",
    structural: "#B9BDC3",
    flow: "#0E7490",
    flowDim: "rgba(14,116,144,0.12)",
    settled: "#16A34A",
    chipBg: "#EEF0F2",
    chipStroke: "rgba(0,0,0,0.10)",
    shadow: "rgba(0,0,0,0.10)",
  },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function build(t, themeName) {
  const el = [];

  // ── primitives ────────────────────────────────────────────────
  const text = (x, y, s, { size = 21, color = t.mid, font = SANS, weight = 400, anchor = "start", tracking = 0 } = {}) =>
    el.push(
      `<text x="${x}" y="${y}" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${color}"` +
        (anchor !== "start" ? ` text-anchor="${anchor}"` : "") +
        (tracking ? ` letter-spacing="${tracking}"` : "") +
        `>${esc(s)}</text>`,
    );
  const eyebrow = (x, y, s, size = 22) => text(x, y, s, { size, color: t.low, font: MONO, tracking: 2.6 });

  const lane = (x, y, w, h, label) => {
    el.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${t.lane}" stroke="${t.laneStroke}" stroke-width="1"/>`);
    eyebrow(x + 20, y + 28, label, 20);
  };

  const card = (x, y, w, h, title, opts = {}) => {
    el.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${t.card}" stroke="${t.cardStroke}" stroke-width="1" filter="url(#cardShadow)"/>`,
    );
    // slim header strip (rounded top corners only)
    el.push(
      `<path d="M ${x + 1} ${y + 27} v -14.5 q 0 -11.5 11.5 -11.5 h ${w - 25} q 11.5 0 11.5 11.5 v 14.5 z" fill="${t.header}"/>`,
    );
    text(x + 14, y + 20, title, { size: 19, color: t.hi, font: MONO, weight: 600, tracking: 1.2 });
    if (opts.body) text(x + 14, y + 52, opts.body, { size: 20, color: t.mid });
    if (opts.caption) text(x + 14, y + (opts.captionY ?? 76), opts.caption, { size: 18, color: t.low });
  };

  const chip = (x, y, label, { color = t.mid, w = null, mono = true } = {}) => {
    const cw = w ?? Math.round(label.length * 11.4) + 20;
    el.push(`<rect x="${x}" y="${y}" width="${cw}" height="26" rx="13" fill="${t.chipBg}" stroke="${t.chipStroke}" stroke-width="1"/>`);
    text(x + cw / 2, y + 18.5, label, { size: 17, color, font: mono ? MONO : SANS, anchor: "middle" });
    return cw;
  };

  const structural = (d, { arrow = false } = {}) =>
    el.push(`<path d="${d}" fill="none" stroke="${t.structural}" stroke-width="2"${arrow ? ' marker-end="url(#arrGrey)"' : ""}/>`);
  const flow = (d) =>
    el.push(`<path d="${d}" fill="none" stroke="${t.flow}" stroke-width="3" stroke-dasharray="7 7" marker-end="url(#arrFlow)"/>`);

  const badge = (x, y, n, label, { side = "right", labelDy = 7 } = {}) => {
    el.push(`<circle cx="${x}" cy="${y}" r="17" fill="${t.bg}" stroke="${t.flow}" stroke-width="2"/>`);
    text(x, y + 7, String(n), { size: 20, color: t.flow, font: MONO, weight: 600, anchor: "middle" });
    if (!label) return;
    if (side === "right") text(x + 26, y + labelDy, label, { size: 19, color: t.mid });
    else if (side === "left") text(x - 26, y + labelDy, label, { size: 19, color: t.mid, anchor: "end" });
    else if (side === "below") text(x, y + 17 + 24, label, { size: 19, color: t.mid, anchor: "middle" });
    else if (side === "above") text(x, y - 17 - 12, label, { size: 19, color: t.mid, anchor: "middle" });
  };

  const liveDot = (x, y) => {
    el.push(`<circle cx="${x}" cy="${y}" r="9" fill="${t.flowDim}"/>`);
    el.push(`<circle cx="${x}" cy="${y}" r="4" fill="${t.flow}"/>`);
  };

  // ── title block ───────────────────────────────────────────────
  eyebrow(48, 66, "SLUICE — SYSTEM ARCHITECTURE", 26);
  text(48, 100, "Metered nanopayments, batch-settled on Arc via Circle Gateway — every unit priced, every receipt verifiable.", {
    size: 23, color: t.mid,
  });

  // ── lanes ─────────────────────────────────────────────────────
  lane(40, 128, 1680, 148, "ACTORS");
  lane(40, 292, 1680, 132, "SURFACES");
  lane(40, 440, 1680, 236, "SLUICE CORE");
  lane(40, 692, 1680, 148, "CIRCLE LAYER");
  lane(40, 856, 1680, 160, "ARC TESTNET — CHAIN ID 5042002 · USDC GAS");

  // ── lane 1: actors ────────────────────────────────────────────
  card(100, 166, 260, 88, "HUMAN", { body: "Browser · Reown wallet" });
  chip(114, 220, "connect", { color: t.low });

  card(700, 166, 360, 88, "BUYER AGENT", { body: "LLM reasons · code enforces" });
  // budget bar
  el.push(`<rect x="714" y="224" width="180" height="10" rx="5" fill="${t.chipBg}"/>`);
  el.push(`<rect x="714" y="224" width="118" height="10" rx="5" fill="${t.flow}" opacity="0.85"/>`);
  text(904, 234, "budget", { size: 16, color: t.low, font: MONO });
  chip(972, 216, "policy", { color: t.low });

  card(1340, 166, 300, 88, "PARTNER AGENTS", { body: "Other teams' buyers" });
  chip(1354, 216, "x402", { color: t.flow });
  text(1444, 234, "pay endpoints directly", { size: 16, color: t.low });

  // ── lane 2: surfaces ──────────────────────────────────────────
  card(100, 328, 200, 88, "LANDING / ASK", { body: "public site · /ask" });
  card(380, 328, 460, 88, "CONSOLE");
  {
    let cx = 394;
    for (const c of ["Earn", "Spend", "Streams", "Bazaar"]) cx += chip(cx, 352, c, { color: t.mid, mono: false }) + 8;
    cx = 394;
    for (const c of ["Funding", "Treasury", "Settlements"]) cx += chip(cx, 383, c, { color: t.mid, mono: false }) + 8;
  }
  card(920, 328, 140, 88, "DOCS", { body: "/docs" });
  card(1100, 328, 210, 88, "SLUICE-PAY SDK", { body: "one-call x402 pay" });
  card(1350, 328, 210, 88, "MCP SERVER", { body: "agent-native tools" });

  // ── lane 3: sluice core ───────────────────────────────────────
  card(100, 470, 220, 64, "REGISTRY", { body: "priced endpoints" });
  card(100, 550, 220, 64, "PROFILES", { body: "1 profile = 1 human" });

  // THE METER — center stage, slightly larger, valve-on-a-line motif
  el.push(`<rect x="560" y="470" width="440" height="160" rx="14" fill="${t.card}" stroke="${t.flow}" stroke-opacity="0.45" stroke-width="1.5" filter="url(#cardShadow)"/>`);
  el.push(`<path d="M 561 499 v -14 q 0 -14 14 -14 h 410 q 14 0 14 14 v 14 z" fill="${t.header}"/>`);
  text(576, 491, "THE METER", { size: 22, color: t.hi, font: MONO, weight: 700, tracking: 1.6 });
  // valve motif: line through a circle (the logo's gate-on-a-pipe)
  el.push(`<line x1="880" y1="484" x2="946" y2="484" stroke="${t.flow}" stroke-width="2.5"/>`);
  el.push(`<circle cx="913" cy="484" r="9" fill="${t.card}" stroke="${t.flow}" stroke-width="2.5"/>`);
  liveDot(972, 484);
  {
    let mx = 576;
    for (const u of ["per_request", "per_citation"]) mx += chip(mx, 514, u, { color: t.mid }) + 10;
    mx = 576;
    for (const u of ["per_second", "per_listen"]) mx += chip(mx, 548, u, { color: t.mid }) + 10;
  }
  text(576, 606, "accrual ledger · batches sub-floor units", { size: 19, color: t.low });

  // settlement backends — two inner rows
  card(1060, 470, 300, 160, "SETTLEMENT");
  el.push(`<rect x="1074" y="510" width="272" height="44" rx="8" fill="${t.chipBg}" stroke="${t.chipStroke}"/>`);
  text(1086, 538, "GatewayBatched", { size: 19, color: t.hi, font: MONO });
  text(1334, 538, "primary", { size: 16, color: t.flow, font: MONO, anchor: "end" });
  el.push(`<rect x="1074" y="564" width="272" height="44" rx="8" fill="${t.chipBg}" stroke="${t.chipStroke}"/>`);
  text(1086, 592, "DirectX402", { size: 19, color: t.mid, font: MONO });
  text(1334, 592, "fallback", { size: 16, color: t.low, font: MONO, anchor: "end" });

  card(1400, 470, 260, 64, "RECEIPTS", { body: "immutable store" });
  card(1400, 550, 260, 64, "RSS / RSSHUB", { body: "feeds → resources" });

  // ── lane 4: circle layer ──────────────────────────────────────
  card(100, 728, 340, 84, "GATEWAY WALLET", { body: "deposits · verifying contract" });
  text(114, 800, "0x0077…19B9", { size: 17, color: t.low, font: MONO });
  card(560, 728, 360, 84, "X402 HANDSHAKE", { body: "402 → sign EIP-3009 → retry" });
  card(1040, 728, 400, 84, "CIRCLE GATEWAY", { body: "verify <1s · batch & settle" });
  liveDot(1412, 750);
  text(1054, 800, "gas-free attested ledger", { size: 17, color: t.low });

  // ── lane 5: arc testnet ───────────────────────────────────────
  card(100, 896, 230, 76, "ROYALTYSPLITTER", { body: "fan-out by share" });
  card(370, 896, 220, 76, "BONDESCROW", { body: "slash / release" });
  card(630, 896, 300, 76, "ERC-8004", { body: "identity · reputation" });
  card(970, 896, 200, 76, "FUNDING POOL", { body: "quadratic match" });
  card(1210, 896, 180, 76, "ARCSCAN", { body: "explorer" });
  // explorer glyph: magnifier
  el.push(`<circle cx="1352" cy="946" r="11" fill="none" stroke="${t.mid}" stroke-width="2.5"/>`);
  el.push(`<line x1="1360" y1="954" x2="1372" y2="966" stroke="${t.mid}" stroke-width="2.5" stroke-linecap="round"/>`);

  // receipt callout — the citation-toll thesis in miniature
  el.push(`<rect x="1430" y="884" width="270" height="100" rx="12" fill="${t.card}" stroke="${t.settled}" stroke-opacity="0.4" stroke-width="1.5" filter="url(#cardShadow)"/>`);
  text(1444, 908, "RECEIPT — CITATION TOLL", { size: 16, color: t.low, font: MONO, tracking: 1.2 });
  text(1444, 936, "claim → source → payment → author", { size: 16, color: t.mid });
  text(1444, 966, "$0.000002", { size: 20, color: t.hi, font: MONO, weight: 600 });
  // settled tick
  el.push(`<circle cx="1596" cy="959" r="11" fill="none" stroke="${t.settled}" stroke-width="2.5"/>`);
  el.push(`<path d="M 1590 959 l 4.5 4.5 l 8 -9" fill="none" stroke="${t.settled}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  text(1616, 966, "settled", { size: 16, color: t.settled, font: MONO });

  // ── structural connectors (grey, orthogonal, no node crossings) ─
  structural("M 200 254 V 322", { arrow: true });                       // human → landing/ask
  structural("M 440 404 V 530 H 554", { arrow: true });                 // console → meter
  structural("M 320 494 H 554", { arrow: true });                       // registry → meter
  structural("M 1360 502 H 1394", { arrow: true });                     // settlement → receipts
  structural("M 1450 254 V 322", { arrow: true });                      // partner agents → mcp? no: down to MCP column — partner agents call endpoints; link to MCP surface
  structural("M 560 790 H 446", { arrow: true });                       // handshake → gateway wallet (its EIP-712 verifying contract)
  // on-chain call trunk: core → contracts bus
  structural("M 580 630 V 660 H 500 V 848");
  structural("M 215 848 H 1070");
  structural("M 215 848 V 892", { arrow: true });
  structural("M 480 848 V 892", { arrow: true });
  structural("M 780 848 V 892", { arrow: true });
  structural("M 1070 848 V 892", { arrow: true });
  text(560, 840, "on-chain calls", { size: 15, color: t.low, font: MONO });
  structural("M 1390 934 H 1426", { arrow: true });                     // arcscan → receipt callout

  // ── the numbered payment flow (one story, ①→⑧) ────────────────
  flow("M 100 190 H 68 V 770 H 94");                                    // ① human → gateway wallet (deposit)
  badge(68, 284, 1, "deposit USDC", { side: "right" });
  flow("M 880 254 V 464");                                              // ② agent → meter (request → 402)
  badge(880, 309, 2, "request → 402 + price", { side: "right" });
  flow("M 640 630 V 722");                                              // ③ meter → handshake (sign)
  badge(640, 660, 3, "sign EIP-3009 vs the Gateway Wallet", { side: "left" });
  flow("M 840 728 V 636");                                              // ④ handshake → meter (retry)
  badge(840, 700, 4, "retry with Payment-Signature", { side: "right" });
  flow("M 920 770 H 1034");                                             // ⑤ handshake → gateway (verify)
  badge(978, 770, 5, "", {});
  text(978, 815, "verify <1s", { size: 19, color: t.mid, font: SANS, anchor: "middle" });
  flow("M 1000 610 H 1054");                                            // ⑥ meter → settlement (accrue → batch)
  badge(1028, 610, 6, "", {});
  text(1028, 656, "accrue → batch", { size: 19, color: t.mid, anchor: "middle" });
  flow("M 1210 630 V 722");                                             // settlement → gateway (the batch)
  flow("M 1150 812 V 850");                                             // ⑦ gateway → arc (settle)
  badge(1150, 833, 7, "settles on Arc · gas-free", { side: "right" });
  flow("M 1150 858 V 872 H 1296 V 890");                                // ⑧ → arcscan
  badge(1180, 872, 8, "", {});
  text(1322, 866, "receipt → Arcscan", { size: 18, color: t.mid });

  // ── legend ────────────────────────────────────────────────────
  const ly = 1048;
  el.push(`<line x1="48" y1="${ly}" x2="92" y2="${ly}" stroke="${t.structural}" stroke-width="2"/>`);
  text(102, ly + 6, "structural", { size: 18, color: t.low });
  el.push(`<line x1="212" y1="${ly}" x2="256" y2="${ly}" stroke="${t.flow}" stroke-width="3" stroke-dasharray="7 7"/>`);
  text(266, ly + 6, "payment flow", { size: 18, color: t.low });
  el.push(`<rect x="404" y="${ly - 8}" width="16" height="16" rx="4" fill="none" stroke="${t.mid}" stroke-width="2"/>`);
  text(430, ly + 6, "on-chain anchor", { size: 18, color: t.low });
  liveDot(608, ly);
  text(626, ly + 6, "live", { size: 18, color: t.low });

  // version bottom-right
  text(1712, ly + 6, "v1.0 · July 2026 · sluiceflow.vercel.app", { size: 17, color: t.low, font: MONO, anchor: "end" });

  // ── document ──────────────────────────────────────────────────
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1760 1080" font-family="${esc(SANS)}">
<title>Sluice architecture — metered nanopayments settled on Arc via Circle Gateway</title>
<desc>Five lanes: actors (human, buyer agent, partner agents), surfaces (landing, console, docs, SDK, MCP), Sluice core (registry, the Meter, settlement backends, receipts, connectors, profiles), the Circle layer (Gateway Wallet, x402 handshake, Circle Gateway), and Arc testnet contracts (RoyaltySplitter, BondEscrow, ERC-8004, funding pool, Arcscan). A numbered eight-step payment flow runs from deposit through request, EIP-3009 signature, sub-second verification, metered accrual, gas-free batch settlement on Arc, to a verifiable receipt. Theme: ${themeName}.</desc>
<defs>
  <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
    <circle cx="1.5" cy="1.5" r="1.2" fill="${t.dot.startsWith("rgba(255") ? "#FFFFFF" : "#000000"}" opacity="${t.dot.match(/0\.\d+/)[0]}"/>
  </pattern>
  <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="${themeName === "dark" ? 0.35 : 0.08}"/>
  </filter>
  <marker id="arrGrey" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
    <path d="M 0 0 L 8 4.5 L 0 9 z" fill="${t.structural}"/>
  </marker>
  <marker id="arrFlow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
    <path d="M 0 0 L 8 4.5 L 0 9 z" fill="${t.flow}"/>
  </marker>
</defs>
<rect width="1760" height="1080" fill="${t.bg}"/>
<rect width="1760" height="1080" fill="url(#dots)"/>
${el.join("\n")}
</svg>`;
}

for (const name of ["dark", "light"]) {
  const svg = build(THEMES[name], name);
  writeFileSync(join(outDir, `architecture-${name}.svg`), svg);
  console.log(`wrote architecture-${name}.svg (${(svg.length / 1024).toFixed(1)} KB)`);
}

// rasters: 2x of dark (fallback/social) + 830px legibility checks for both
const dark = join(outDir, "architecture-dark.svg");
const light = join(outDir, "architecture-light.svg");
await sharp(dark, { density: 288 }).resize(3520).png().toFile(join(outDir, "architecture.png"));
await sharp(dark, { density: 288 }).resize(830).png().toFile(join(outDir, "_check-dark-830.png"));
await sharp(light, { density: 288 }).resize(830).png().toFile(join(outDir, "_check-light-830.png"));
await sharp(light, { density: 288 }).resize(3520).png().toFile(join(outDir, "_check-light-2x.png"));
console.log("rasters written (architecture.png @2x + 830px checks)");
