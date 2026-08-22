// One-off: verify the grid renders on the LIVE deployed site.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 300));
});

await page.goto("https://raidor2050.github.io/EchoSheets/", { waitUntil: "networkidle" });
await page.getByText("Try the sample dataset").click({ timeout: 15000 });
await page.getByRole("button", { name: /Open in editor/i }).click({ timeout: 15000 });
await page.waitForTimeout(3000);

const box = await page.locator('[data-testid="data-grid-canvas"]').boundingBox();
console.log(
  JSON.stringify({
    liveGridCanvas: box ? `${Math.round(box.width)}x${Math.round(box.height)}` : null,
    errors,
  }),
);
await browser.close();
