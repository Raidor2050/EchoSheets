// Diagnostic: open sample dataset -> inspect canvas layout chain.
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 4200 + Math.floor(Math.random() * 100);
const URL = `http://localhost:${PORT}/EchoSheets/`;

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
  shell: true,
  env: { ...process.env, ECHOSHEETS_PAGES: "1" },
});
const killServer = () => {
  try {
    if (process.platform === "win32")
      spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { shell: true });
    else server.kill();
  } catch {}
};
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(URL)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.getByText("Try the sample dataset").click();
await page.getByRole("button", { name: /Open in editor/i }).click({ timeout: 15000 });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  if (!canvas) return "NO CANVAS IN DOM";
  const chain = [];
  let el = canvas;
  for (let i = 0; i < 8 && el; i++) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    chain.push({
      depth: i,
      tag: el.tagName,
      cls: String(el.className).slice(0, 80),
      rect: `${Math.round(r.width)}x${Math.round(r.height)}`,
      styleAttr: String(el.getAttribute("style")).slice(0, 160),
      display: cs.display,
      position: cs.position,
      width: cs.width,
      height: cs.height,
      overflow: cs.overflow,
    });
    el = el.parentElement;
  }
  return chain;
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
killServer();
