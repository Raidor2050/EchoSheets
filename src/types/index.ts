export type ColumnType = "text" | "number" | "date" | "boolean" | "empty";

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  values: (string | null)[];
}

export interface DatasetMeta {
  id: string;
  name: string;
  sizeBytes: number | null;
  importedAt: number;
}

/** Raw result of parsing a CSV file — columns are untyped strings. */
export interface ParsedCsv {
  headers: string[];
  /** values[colIndex][rowIndex] — column-major for AI + grid performance. */
  columns: (string | null)[][];
}

export interface ParseProgress {
  rows: number;
  bytes: number;
}

/** A single cell-level change. `from`/`to` use null for empty cells. */
export interface CellPatch {
  colId: string;
  row: number;
  from: string | null;
  to: string | null;
}

export type HistoryKind = "edit" | "ai" | "structural";

export interface HistoryEntry {
  id: string;
  label: string;
  kind: HistoryKind;
  patches: CellPatch[];
  at: number;
}

/** Rectangular selection in (col,row) indexes, inclusive. */
export interface CellRect {
  c0: number;
  r0: number;
  c1: number;
  r1: number;
}

export type SelectionScope =
  | { kind: "none" }
  | { kind: "cell"; col: number; row: number }
  | { kind: "range"; rect: CellRect }
  | { kind: "rows"; from: number; to: number }
  | { kind: "cols"; from: number; to: number };

export const colA1 = (index: number): string => {
  let s = "";
  let n = index;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};

export interface StagedCell {
  value: string;
  status: "pending" | "ok" | "error";
  error?: string;
  excluded?: boolean;
}

export type OutputMode = { mode: "new-column"; name: string } | { mode: "replace" };

export interface AiPlan {
  id: string;
  title: string;
  instruction: string;
  strategy: "deterministic" | "llm" | "analyze";
  targetColIds: string[];
  output: OutputMode;
  /** Deterministic transform applied per cell when strategy is deterministic. */
  fn?: (value: string, rowValues: Record<string, string | null>) => string | null;
  /** LLM per-row instruction template; {{Col Name}} placeholders are substituted. */
  rowTemplate?: string;
  analysisLabel?: string;
  /** Extra context appended to LLM prompts (target columns, scope). */
  inputHint?: string;
}

export interface AiOperationRecord {
  id: string;
  at: number;
  title: string;
  instruction: string;
  scopeLabel: string;
  strategy: "deterministic" | "llm";
  model: string | null;
  inputColumns: string[];
  outputColumn: string | null;
  affectedCells: number;
  okCells: number;
  failedCells: number;
  durationMs: number;
}
