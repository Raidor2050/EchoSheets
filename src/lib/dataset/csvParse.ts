import { inferSchema, initParser } from "udsv";

export interface ParseResult {
  headers: string[];
  columns: (string | null)[][];
  rowCount: number;
}

export interface ParseOptions {
  /** Report cumulative parsed rows every N rows. */
  progressEvery?: number;
  onProgress?: (rows: number) => void;
}

/** Strip UTF-8/UTF-16 byte-order marks so schema inference sees clean text. */
export function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  if (text.charCodeAt(0) === 0xfffe) return text.slice(1);
  return text;
}

/**
 * Pure RFC-4180 CSV parsing shared by the Web Worker and the main-thread
 * fallback. Delimiter (comma/tab/pipe/semicolon), enclosure and row endings
 * are auto-detected via uDSV schema inference.
 *
 * Throws an Error with a human-readable message for empty input or content
 * uDSV cannot make sense of.
 */
export function parseCsvText(text: string, options: ParseOptions = {}): ParseResult {
  const clean = stripBom(text);
  if (clean.trim() === "") {
    throw new Error("the file appears to be empty");
  }

  let rows: string[][];
  let cols: { name: string }[];
  try {
    const schema = inferSchema(clean);
    cols = schema.cols;
    rows = initParser(schema).stringArrs(clean) as unknown as string[][];
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`malformed CSV (${detail})`);
  }

  const headers: string[] = cols.map((c, i) => {
    const name = typeof c?.name === "string" ? c.name.trim() : "";
    return name === "" ? `Column ${i + 1}` : name;
  });
  const colCount = headers.length;

  // A header-only sheet is valid but has nothing to show; keep rowCount 0 and
  // let callers decide how to present it.
  if (colCount === 0 || rows.length === 0) {
    return { headers, columns: [], rowCount: Math.max(rows.length, 0) };
  }

  const columns: (string | null)[][] = Array.from({ length: colCount }, () => []);
  const every = options.progressEvery ?? 25000;
  const onProgress = options.onProgress;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < colCount; c++) {
      const v = row[c];
      const bucket = columns[c];
      if (bucket) bucket.push(v === "" || v === undefined ? null : v);
    }
    if (onProgress && r % every === 0) onProgress(r + 1);
  }

  return { headers, columns, rowCount: rows.length };
}
