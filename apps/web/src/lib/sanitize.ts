/**
 * Sanitize external/feed content for display (CLAUDE.md Overhaul rule 13). ALL text that
 * originates outside Sluice (RSS titles/summaries, connector descriptions) must pass through
 * here before rendering: strip tags, decode entities, collapse whitespace, truncate to a clean
 * excerpt. Raw `<p>`/`<a href=` must never render as literal text in any card.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  copy: "©",
  trade: "™",
  reg: "®",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => {
      const code = Number.parseInt(h, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, d: string) => {
      const code = Number.parseInt(d, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-zA-Z]+);/g, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Strip HTML to a clean one-to-two-line excerpt.
 * `max` is the character budget (default ~140); truncation appends an ellipsis.
 */
export function sanitizeExcerpt(input: string | null | undefined, max = 140): string {
  if (!input) return "";
  let s = String(input);
  // Drop script/style bodies entirely, then all tags.
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<[^>]*>/g, " ");
  // Feeds often TRUNCATE summaries mid-tag ("…<a href=\"https://x" with no closing ">") —
  // remove any unclosed trailing tag fragment too.
  s = s.replace(/<[^>]*$/, " ");
  // Entities can hide a second layer of markup (&lt;p&gt;) — decode, then strip again.
  s = decodeEntities(s);
  s = s.replace(/<[^>]*>/g, " ").replace(/<[^>]*$/, " ");
  // Orphan attribute fragments left by truncated tags (href="…", src='…').
  s = s.replace(/\b(href|src|target|rel|class|style)\s*=\s*["'][^"']*["']?/gi, " ");
  // Boilerplate lead-ins some feeds prepend.
  s = s.replace(/\b(Article|Comments) URL:\s*\S+/gi, " ");
  s = s.replace(/\bPoints:\s*\d+(\s*#\s*Comments:\s*\d+)?/gi, " ");
  // Bare URLs read as noise in a card and their unbroken length wrecks mobile layout —
  // reduce them to their hostname.
  s = s.replace(/\bhttps?:\/\/[^\s]+/gi, (m) => {
    try {
      return new URL(m).hostname;
    } catch {
      return " ";
    }
  });
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > max) {
    const cut = s.slice(0, max);
    const atWord = cut.lastIndexOf(" ") > max * 0.6 ? cut.slice(0, cut.lastIndexOf(" ")) : cut;
    s = `${atWord.replace(/[,;:.\s]+$/, "")}…`;
  }
  return s;
}

/** Sanitize a short label/title (entities + tags, no truncation beyond a hard cap). */
export function sanitizeLabel(input: string | null | undefined, max = 200): string {
  return sanitizeExcerpt(input, max);
}
