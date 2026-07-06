import { chromium } from "playwright";
const BASE = "http://localhost:3005";
const targets: Array<{ url: string; find: string; name: string }> = [
  { url: "/", find: "If it can be counted", name: "units" },
  { url: "/", find: "Agents paying creators", name: "economy" },
  { url: "/", find: "Gateway settles on Arc", name: "step03" },
  { url: "/ask", find: "Ask the research agent", name: "ask-intro" },
  { url: "/ask", find: "compensable event", name: "ask-pass" },
  { url: "/app/earn", find: "Real work becomes a priced resource", name: "earn-intro" },
  { url: "/app/earn", find: "One payment, split on-chain", name: "earn-split" },
  { url: "/app/spend", find: "Budget in, judgment shown", name: "spend-panel" },
  { url: "/app/settlements", find: "How batching works", name: "settle-batch" },
  { url: "/app/treasury", find: "out of the box", name: "treasury-card" },
  { url: "/docs/quickstart", find: "What Sluice is", name: "docs-quickstart" },
];
const run = async () => {
  const browser = await chromium.launch();
  for (const scheme of ["dark", "light"] as const) {
    for (const w of [1440, 390]) {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: w, height: w > 800 ? 900 : 844 }, deviceScaleFactor: 1.5 });
      await ctx.addInitScript((t) => { try { localStorage.setItem("sluice-tour-done", "1"); localStorage.setItem("sluice-firstrun-dismissed", "1"); localStorage.setItem("theme", t as string); } catch {} }, scheme);
      const page = await ctx.newPage();
      let last = "";
      for (const t of targets) {
        if (t.url !== last) { await page.goto(BASE + t.url, { waitUntil: "networkidle" }).catch(() => {}); await page.waitForTimeout(1800); last = t.url; }
        const el = page.getByText(t.find, { exact: false }).first();
        try {
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(900);
          const section = el.locator("xpath=ancestor::section[1] | xpath=ancestor::*[contains(@class,'card') or self::section][1]");
          await page.screenshot({ path: `/tmp/ed2/${t.name}-${w}-${scheme}.png` });
        } catch { console.log("miss", t.name, w, scheme); }
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log("done");
};
run();
