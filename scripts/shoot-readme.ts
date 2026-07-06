/** Captures the curated README screenshots from the local prod build (:3005). */
import { chromium } from "playwright";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3005";
const shots: Array<{ name: string; path: string; height?: number; settle?: number }> = [
  { name: "landing-hero", path: "/", height: 900, settle: 4500 },
  { name: "ask", path: "/ask", height: 1050, settle: 2500 },
  { name: "agent-console", path: "/app/spend", height: 1000, settle: 2500 },
  { name: "settlements", path: "/app/settlements", height: 1000, settle: 2500 },
  { name: "creator-studio", path: "/app/earn", height: 1000, settle: 2500 },
  { name: "traction", path: "/traction", height: 1050, settle: 2500 },
];

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("sluice-tour-done", "1");
      localStorage.setItem("sluice-first-run-dismissed", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  for (const s of shots) {
    await page.setViewportSize({ width: 1440, height: s.height ?? 900 });
    await page.goto(BASE + s.path, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(s.settle ?? 2000);
    await page.screenshot({ path: `docs/screenshots/${s.name}.png` });
    console.log("shot", s.name);
  }
  await browser.close();
};
run();
