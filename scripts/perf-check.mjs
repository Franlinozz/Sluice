/** R2 perf gate: CLS + long-frame measurement on the heaviest pages (landing, overview). */
import { chromium } from "playwright";
const b = await chromium.launch();
for (const route of ["/", "/app", "/app/meter", "/app/settlements"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`http://localhost:3005${route}`, { waitUntil: "domcontentloaded" });
  await p.evaluate(() => {
    const w = window;
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    w.__long = 0;
    new PerformanceObserver((list) => {
      w.__long += list.getEntries().filter((e) => e.duration > 50).length;
    }).observe({ type: "longtask", buffered: true });
  });
  // exercise: scroll through the page (triggers reveals + canvas), then idle
  await p.mouse.wheel(0, 900); await p.waitForTimeout(700);
  await p.mouse.wheel(0, 1400); await p.waitForTimeout(700);
  await p.mouse.wheel(0, 2200); await p.waitForTimeout(900);
  const { cls, long } = await p.evaluate(() => ({ cls: window.__cls, long: window.__long }));
  console.log(`${route.padEnd(18)} CLS=${cls.toFixed(4)}  longTasks(>50ms)=${long}`);
  await p.close();
}
await b.close();
