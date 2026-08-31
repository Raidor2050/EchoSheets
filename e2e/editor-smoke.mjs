// Headless smoke test: load prod bundle -> sample dataset -> editor.
// Captures console errors, page errors, canvas geometry, screenshot.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 4200 + Math.floor(Math.random() * 100);
const URL = `http://localhost:${PORT}/EchoSheets/`;

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "pipe",
  shell: true,
  // vite.config reads base from this env at startup — keep it in sync with
  // the build that produced dist/.
  env: { ...process.env, ECHOSHEETS_PAGES: "1" },
});
let srvLog = "";
server.stdout.on("data", (d) => (srvLog += d));
server.stderr.on("data", (d) => (srvLog += d));

const killServer = () => {
  try {
    if (process.platform === "win32")
      spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { shell: true });
    else server.kill();
  } catch {}
};

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(URL);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview server never came up\n${srvLog}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning")
    consoleErrors.push(`${m.type()}: ${m.text().slice(0, 400)}`);
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 800)}`));

mkdirSync("../opencode/echosheets-shots", { recursive: true });
const shot = (n) => page.screenshot({ path: `../opencode/echosheets-shots/${n}.png` });

try {
  await waitForServer();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  console.log("== after load ==");
  console.log(
    "bodyText:",
    JSON.stringify((await page.locator("body").innerText()).slice(0, 300)),
  );
  await shot("1-import");

  await page.getByText("Try the sample dataset").click({ timeout: 10000 });
  await page.getByRole("button", { name: /Open in editor/i }).click({ timeout: 15000 });
  await page.waitForTimeout(3000);

  const canvases = await page.locator("canvas").count();
  const boxes = [];
  for (let i = 0; i < Math.min(canvases, 6); i++) {
    const b = await page.locator("canvas").nth(i).boundingBox();
    boxes.push(
      b ? `${Math.round(b.width)}x${Math.round(b.height)}@y${Math.round(b.y)}` : null,
    );
  }
  console.log("== after open ==");
  console.log(
    JSON.stringify(
      { canvases, boxes, bodyText: (await page.locator("body").innerText()).slice(0, 400) },
      null,
      2,
    ),
  );

  // Regression gate: the grid canvas must actually lay out. A missing GDG CSS
  // import collapses it to a bare empty div (black editor screen).
  const gridCanvasBox = await page
    .locator('[data-testid="data-grid-canvas"]')
    .boundingBox();
  if (!gridCanvasBox || gridCanvasBox.width < 100 || gridCanvasBox.height < 100) {
    throw new Error(
      `data-grid-canvas did not render (box=${JSON.stringify(gridCanvasBox)}) — is glide-data-grid CSS imported?`,
    );
  }
  console.log(
    `✓ data-grid-canvas ${Math.round(gridCanvasBox.width)}x${Math.round(gridCanvasBox.height)}`,
  );

  // Sheets-chrome regression gate: formula bar (fx + cell ref), menu bar and
  // sheet tabs must all be present in the editor shell.
  const chrome = {
    fx: (await page.locator('[aria-label="Insert function"]').count()) === 1,
    cellRef: (await page.locator('[aria-label="Cell content"]').count()) === 1,
    menuBar: (await page.getByText("File").count()) > 0,
    addSheet: (await page.locator('[aria-label="Add sheet"]').count()) === 1,
    activeTab: (await page.locator('[aria-label="All sheets"]').count()) === 1,
  };
  console.log("chrome:", JSON.stringify(chrome));
  if (!chrome.fx || !chrome.cellRef || !chrome.menuBar || !chrome.addSheet || !chrome.activeTab) {
    throw new Error(`expected Sheets chrome missing: ${JSON.stringify(chrome)}`);
  }
  console.log("✓ Sheets chrome (formula bar, menus, sheet tabs) rendered");
  await shot("2-editor");
} catch (err) {
  console.log("== FAILED ==");
  console.log(String(err).slice(0, 800));
  try {
    await shot("3-failure");
    console.log(
      "bodyText:",
      JSON.stringify((await page.locator("body").innerText()).slice(0, 300)),
    );
  } catch {}
} finally {
  console.log("--- console/page errors ---");
  for (const e of consoleErrors) console.log(e);
  if (consoleErrors.length === 0) console.log("(none)");
  await browser.close();
  killServer();
}
