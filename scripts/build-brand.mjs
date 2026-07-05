/**
 * Brand asset pipeline (Overhaul R1, CLAUDE.md rule 18). Sources: the user-committed images in
 * docs/ (each opened + verified by eye) + Michroma (OFL) for the SLUICE wordmark. Outputs the
 * canonical set in apps/web/public/brand/ plus packages/ui/src/primitives/logo-paths.ts so the
 * React logo stays vector, currentColor-themable, and flash-free.
 *
 *   node scripts/build-brand.mjs        (requires: sharp, opentype.js, png-to-ico, potrace on PATH)
 */
import sharp from "sharp";
import opentype from "opentype.js";
import pngToIco from "png-to-ico";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = {
  markOnDark: "docs/Sluice white logo on dark background.png",
  markOnLight: "docs/Sluice dark logo on white background.png",
  banner: "docs/Sluice hero banner dark background.png",
  texture: "docs/dotted-texture.jpg",
};
const OUT = "apps/web/public/brand";
mkdirSync(OUT, { recursive: true });

const INK = "#16181d"; // glyph on light
const PAPER = "#F2F3F5"; // glyph on dark
const FONT = process.env.MICHROMA_TTF ?? "/tmp/Michroma-Regular.ttf";

// ── 1. glyph mask + bbox ─────────────────────────────────────────────────────
async function glyphMask() {
  // white-on-dark → luminance IS the alpha of the glyph
  const { data, info } = await sharp(SRC.markOnDark).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] > 96) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { data, width, height, bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } };
}

/** Tinted, alpha-masked, trimmed glyph PNG. */
async function glyphPng(mask, hex, pad = 0.06) {
  const { data, width, bbox } = mask;
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16));
  const px = Math.round(bbox.w * pad);
  const py = Math.round(bbox.h * pad);
  const W = bbox.w + px * 2, H = bbox.h + py * 2;
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < bbox.h; y++) {
    for (let x = 0; x < bbox.w; x++) {
      const v = data[(bbox.y + y) * width + (bbox.x + x)];
      const a = v < 28 ? 0 : v; // noise floor: source black bg is ~8-15, never opaque
      const o = ((y + py) * W + (x + px)) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png();
}

// ── 2. vectorize glyph (potrace) ─────────────────────────────────────────────
async function glyphVector(mask) {
  // potrace wants a bitmap of the DARK shapes → build a PGM from the inverted mask
  const { data, width, height } = mask;
  const pgm = Buffer.concat([Buffer.from(`P5\n${width} ${height}\n255\n`), Buffer.from(data.map((v) => 255 - v))]);
  writeFileSync("/tmp/glyph.pgm", pgm);
  execFileSync("potrace", ["-s", "--flat", "-o", "/tmp/glyph.svg", "/tmp/glyph.pgm"]);
  const svg = readFileSync("/tmp/glyph.svg", "utf8");
  const g = svg.match(/<g[\s\S]*<\/g>/)?.[0] ?? "";
  return g.replace(/fill="#000000"/g, 'fill="currentColor"').replace(/stroke="none"/g, "");
}

// ── 3. Michroma wordmark → paths ─────────────────────────────────────────────
let _font;
function getFont() {
  if (_font) return _font;
  const buf = readFileSync(FONT);
  _font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return _font;
}

async function wordmarkPaths(text, size, trackingEm) {
  const font = getFont();
  const tracking = size * trackingEm;
  let x = 0;
  const parts = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const p = glyph.getPath(x, 0, size);
    const d = p.toPathData(3);
    if (d) parts.push(d);
    x += (glyph.advanceWidth / font.unitsPerEm) * size + tracking;
  }
  const capHeight = ((font.tables.os2?.sCapHeight ?? font.ascender * 0.72) / font.unitsPerEm) * size;
  return { d: parts.join(" "), width: x - tracking, capHeight };
}

// ── 4. compose lockups ───────────────────────────────────────────────────────
function lockupSvg(glyphG, gvb, word, fill) {
  // glyph height H; wordmark cap-height 0.42H, baseline at glyph vertical center + cap/2
  const H = gvb.h;
  const scale = (0.42 * H) / word.capHeight;
  const gap = 0.42 * H;
  const wordW = word.width * scale;
  const W = gvb.w + gap + wordW;
  const baseline = gvb.y + H / 2 + (0.42 * H) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${gvb.x} ${gvb.y} ${W} ${H}" fill="${fill}" style="color:${fill}">
${glyphG}
<g transform="translate(${gvb.x + gvb.w + gap}, ${baseline}) scale(${scale})"><path d="${word.d}"/></g>
</svg>`;
}

async function main() {
  const mask = await glyphMask();
  const gvb = { ...mask.bbox };
  console.log(`glyph bbox: ${gvb.w}x${gvb.h} @${gvb.x},${gvb.y}`);

  // marks
  await (await glyphPng(mask, PAPER)).toFile(join(OUT, "logo-mark-dark.png"));
  await (await glyphPng(mask, INK)).toFile(join(OUT, "logo-mark-light.png"));

  const glyphG = await glyphVector(mask);
  const markSvg = (fill) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${gvb.x} ${gvb.y} ${gvb.w} ${gvb.h}" fill="${fill}" style="color:${fill}">${glyphG}</svg>`;
  writeFileSync(join(OUT, "logo-mark-dark.svg"), markSvg(PAPER));
  writeFileSync(join(OUT, "logo-mark-light.svg"), markSvg(INK));

  // wordmark + lockups (Michroma, wide-tracked like the Archon treatment)
  const word = await wordmarkPaths("SLUICE", 100, 0.32);
  writeFileSync(join(OUT, "logo-full-dark.svg"), lockupSvg(glyphG, gvb, word, PAPER));
  writeFileSync(join(OUT, "logo-full-light.svg"), lockupSvg(glyphG, gvb, word, INK));
  for (const v of ["dark", "light"]) {
    await sharp(Buffer.from(readFileSync(join(OUT, `logo-full-${v}.svg`)))).resize({ width: 1600 }).png().toFile(join(OUT, `logo-full-${v}.png`));
  }

  // generated paths module for @sluice/ui (inline, currentColor, flash-free)
  writeFileSync(
    "packages/ui/src/primitives/logo-paths.ts",
    `/** GENERATED by scripts/build-brand.mjs — do not edit by hand. Michroma wordmark + traced mark. */
export const GLYPH_VIEWBOX = "${gvb.x} ${gvb.y} ${gvb.w} ${gvb.h}";
export const GLYPH_G = ${JSON.stringify(glyphG)};
export const WORDMARK_D = ${JSON.stringify(word.d)};
export const WORDMARK_WIDTH = ${word.width.toFixed(2)};
export const WORDMARK_CAP = ${word.capHeight.toFixed(2)};
`,
  );

  // ── banner: re-set the wordmark + tagline in Michroma ──────────────────────
  const bannerImg = sharp(SRC.banner);
  const bmeta = await bannerImg.metadata();
  const BW = bmeta.width, BH = bmeta.height;
  const braw = await sharp(SRC.banner).grayscale().raw().toBuffer();
  // find text bands below the glyph (y > 0.45H): rows with bright pixels in the middle half
  const bands = [];
  let cur = null;
  for (let y = Math.round(BH * 0.45); y < BH; y++) {
    let count = 0;
    for (let x = Math.round(BW * 0.18); x < BW * 0.82; x++) if (braw[y * BW + x] > 110) count++;
    if (count > 12) {
      if (!cur) cur = { y0: y, y1: y };
      else cur.y1 = y;
    } else if (cur && y - cur.y1 > 8) {
      bands.push(cur);
      cur = null;
    }
  }
  if (cur) bands.push(cur);
  console.log("banner text bands:", bands.map((b) => `${b.y0}-${b.y1}`).join(", "));
  // The circuit traces also register as bright bands — the WORDMARK is the tallest band, the
  // tagline is the next band BELOW it. Cover only those two; never touch the traces.
  const wordBand = bands.reduce((a, b) => (b.y1 - b.y0 > (a?.y1 ?? 0) - (a?.y0 ?? 0) ? b : a), bands[0]);
  const tagBand = bands.find((b) => b.y0 > wordBand.y1) ?? { y0: Math.round(BH * 0.78), y1: Math.round(BH * 0.8) };

  // cover the bands with the sampled background tone, then overlay Michroma text
  // Erase the old text by median-filtering the band region of the ORIGINAL image: thin white
  // strokes vanish into the local (vignetted) background, so no flat rectangles are visible.
  const covers = [];
  const cleanTop = Math.min(BH - 60, (bands[bands.length - 1]?.y1 ?? Math.round(BH * 0.8)) + 18);
  for (const b of [wordBand, tagBand]) {
    const top = Math.max(0, b.y0 - 12);
    const height = Math.min(BH - top, b.y1 - b.y0 + 24);
    const left = Math.round(BW * 0.14);
    const width = Math.round(BW * 0.72);
    const srcH = Math.min(48, BH - cleanTop);
    const patch = await sharp(SRC.banner)
      .extract({ left, top: cleanTop, width, height: srcH })
      .resize({ width, height, fit: "fill" })
      .blur(10)
      .toBuffer();
    covers.push({ input: patch, left, top });
  }

  const bannerWord = await wordmarkPaths("SLUICE", 100, 0.34);
  const bannerTag = await wordmarkPaths("REAL-TIME SETTLEMENT · TRUSTLESS FLOW", 100, 0.14);
  const wordH = (wordBand.y1 - wordBand.y0) * 0.92;
  const wScale = (wordH / bannerWord.capHeight) * 1.0;
  const wW = bannerWord.width * wScale;
  const tagH = Math.max(14, (tagBand.y1 - tagBand.y0) * 0.85);
  const tScale = tagH / bannerTag.capHeight;
  const tW = bannerTag.width * tScale;
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${BW}" height="${BH}">
  <g transform="translate(${(BW - wW) / 2}, ${wordBand.y1}) scale(${wScale})" fill="#EDEFF2"><path d="${bannerWord.d}"/></g>
  <g transform="translate(${(BW - tW) / 2}, ${tagBand.y1}) scale(${tScale})" fill="#8A939E"><path d="${bannerTag.d}"/></g>
</svg>`;
  await sharp(SRC.banner)
    .composite([...covers, { input: Buffer.from(overlay), left: 0, top: 0 }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(join(OUT, "banner-hero.png"));

  // ── og-card 1200x630 ────────────────────────────────────────────────────────
  const ogWord = await wordmarkPaths("SLUICE", 100, 0.34);
  const ogTag = await wordmarkPaths("THE SETTLEMENT LAYER FOR THE AGENT-PAID WEB", 100, 0.12);
  const ogW = 1200, ogH = 630;
  const gScale = 150 / gvb.h;
  const gW = gvb.w * gScale;
  const owScale = 64 / ogWord.capHeight;
  const owW = ogWord.width * owScale;
  const otScale = 15 / ogTag.capHeight;
  const otW = ogTag.width * otScale;
  // sharp applies ops in libvips' fixed order (linear before negate) — force sequencing in passes.
  const texDark = await sharp(SRC.texture).resize(ogW, ogH, { fit: "cover" }).negate({ alpha: false }).toBuffer();
  const texA = await sharp(texDark).linear(0.09, 0).png().toBuffer();
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ogW}" height="${ogH}">
  <rect width="${ogW}" height="${ogH}" fill="#0a0b0d"/>
  <g transform="translate(${(ogW - gW) / 2}, 140) scale(${gScale}) translate(${-gvb.x}, ${-gvb.y})" fill="#F2F3F5" style="color:#F2F3F5">${glyphG}</g>
  <g transform="translate(${(ogW - owW) / 2}, 415) scale(${owScale})" fill="#F2F3F5"><path d="${ogWord.d}"/></g>
  <g transform="translate(${(ogW - otW) / 2}, 480) scale(${otScale})" fill="#98A1AB"><path d="${ogTag.d}"/></g>
  <rect x="0" y="${ogH - 3}" width="${ogW}" height="3" fill="#6FE3F0" opacity="0.7"/>
</svg>`;
  const ogBase = await sharp(Buffer.from(ogSvg)).png().toBuffer();
  await sharp(texA).png().toFile("/tmp/og-tex-debug.png");
  await sharp(ogBase)
    .composite([{ input: texA, blend: "screen" }])
    .flatten({ background: "#0a0b0d" })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, "og-card.png"));

  // ── favicons ────────────────────────────────────────────────────────────────
  const tile = async (size, radius) => {
    const glyphBuf = await (await glyphPng(mask, PAPER, 0.02)).toBuffer();
    const inner = Math.round(size * 0.62);
    const resized = await sharp(glyphBuf).resize({ width: inner, height: inner, fit: "inside" }).toBuffer();
    const rm = await sharp(resized).metadata();
    const rrect = Buffer.from(
      `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#0b0c0e"/></svg>`,
    );
    return sharp(rrect)
      .composite([{ input: resized, left: Math.round((size - rm.width) / 2), top: Math.round((size - rm.height) / 2) }])
      .png()
      .toBuffer();
  };
  writeFileSync(join(OUT, "favicon-512.png"), await tile(512, 96));
  writeFileSync(join(OUT, "favicon-192.png"), await tile(192, 36));
  writeFileSync(join(OUT, "apple-touch-icon.png"), await tile(180, 0));
  writeFileSync(join(OUT, "favicon-32.png"), await tile(32, 6));
  writeFileSync(join(OUT, "favicon-16.png"), await tile(16, 3));
  writeFileSync(
    join("apps/web/public", "favicon.ico"),
    await pngToIco([join(OUT, "favicon-16.png"), join(OUT, "favicon-32.png"), await tile(48, 9)]),
  );
  writeFileSync(
    join("apps/web/public", "site.webmanifest"),
    JSON.stringify(
      {
        name: "Sluice",
        short_name: "Sluice",
        description: "The settlement layer for the agent-paid web.",
        icons: [
          { src: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
        ],
        theme_color: "#0b0c0e",
        background_color: "#0b0c0e",
        display: "standalone",
      },
      null,
      2,
    ),
  );

  // ── texture → webp ≤180KB ──────────────────────────────────────────────────
  for (const q of [72, 60, 48, 38]) {
    await sharp(SRC.texture).resize({ width: 1600 }).webp({ quality: q }).toFile(join(OUT, "texture-dots.webp"));
    const kb = statSync(join(OUT, "texture-dots.webp")).size / 1024;
    if (kb <= 180) {
      console.log(`texture-dots.webp: ${Math.round(kb)}KB @q${q}`);
      break;
    }
  }

  console.log("brand build complete →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
