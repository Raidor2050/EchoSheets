// Post-build guard: fails the build if expected production assets are absent.
// Added after a vite incremental-cache glitch shipped a deploy whose
// csv-parse.worker chunk was silently dropped — breaking all CSV imports.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist", import.meta.url));

function fail(msg) {
  console.error(`✗ dist check failed: ${msg}`);
  process.exit(1);
}

let entries;
try {
  entries = readdirSync(root);
} catch {
  fail("dist/ does not exist — did vite build run?");
}
if (!entries.includes("index.html")) fail("dist/index.html is missing");

const assetsDir = join(root, "assets");
let assets;
try {
  assets = readdirSync(assetsDir);
} catch {
  fail("dist/assets/ is missing");
}

if (!assets.some((f) => f.startsWith("index") && f.endsWith(".js"))) {
  fail("main index-*.js bundle is missing");
}
if (!assets.some((f) => f.includes("csv-parse.worker") && f.endsWith(".js"))) {
  fail(
    "csv-parse.worker chunk is missing — CSV imports would fail with 'cannot parse' on the deployed site",
  );
}

console.log(`✓ dist ok (${assets.length} assets incl. csv-parse.worker)`);
