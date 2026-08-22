/// <reference lib="webworker" />
import { inferSchema, initParser } from "udsv";
import type { ParseProgress } from "../types";

/**
 * Parse CSV text (RFC-4180) into a column-major structure inside a worker so
 * the main thread never freezes, even for 100MB+ files.
 * uDSV auto-infers delimiter (comma/tab/pipe/semi), enclosure and row endings.
 */
export function parseCsvText(req: { text: string; progressEvery?: number }): {
  headers: string[];
  columns: (string | null)[][];
  rowCount: number;
} {
  const text = req.text.charCodeAt(0) === 0xfeff ? req.text.slice(1) : req.text;
  const schema = inferSchema(text);
  const parser = initParser(schema);
  const rows = parser.stringArrs(text);

  const headers: string[] = schema.cols.map((c, i) => {
    const name = c.name.trim();
    return name === "" ? `Column ${i + 1}` : name;
  });
  const colCount = headers.length;
  const columns: (string | null)[][] = Array.from({ length: colCount }, () => []);
  const every = req.progressEvery ?? 25000;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] as unknown as string[];
    for (let c = 0; c < colCount; c++) {
      const v = row[c];
      columns[c]?.push(v === "" || v === undefined ? null : v);
    }
    if (r % every === 0) {
      const msg: ParseProgress = { rows: r + 1, bytes: -1 };
      self.postMessage({ type: "progress", payload: msg });
    }
  }

  return { headers, columns, rowCount: rows.length };
}

self.addEventListener("message", (e: MessageEvent<{ text: string }>) => {
  try {
    const result = parseCsvText({ text: e.data.text });
    self.postMessage({ type: "done", payload: result });
  } catch (err) {
    self.postMessage({
      type: "error",
      payload: err instanceof Error ? err.message : "Failed to parse CSV",
    });
  }
});
