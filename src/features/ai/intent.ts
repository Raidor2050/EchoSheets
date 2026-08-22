import { uid } from "../../lib/id";
import type { AiPlan, Column, DatasetMeta } from "../../types";
import {
  extractDomain,
  normalizeWhitespace,
  roundNumber,
  stripCurrency,
  titleCase,
} from "./ops/deterministic";

const looksLikeEmailCol = (col: Column): boolean => {
  if (/mail/i.test(col.name)) return true;
  const sample = col.values.slice(0, 50).filter((v): v is string => !!v);
  return (
    sample.length > 0 && sample.filter((v) => v.includes("@")).length / sample.length > 0.5
  );
};

export interface IntentContext {
  meta: DatasetMeta;
  columns: Column[];
}

/** Build a plan that replaces values in-place across the given columns. */
function replaceInColumns(
  colIds: string[],
  fn: NonNullable<AiPlan["fn"]>,
  id: string,
  title: string,
): AiPlan {
  return {
    id,
    title,
    instruction: title.toLowerCase(),
    strategy: "deterministic",
    targetColIds: colIds,
    output: { mode: "replace" },
    fn,
  };
}

/**
 * Rule-based intent parser — the deterministic first pass. Returns a plan, or
 * null when no rule matches and an LLM planner should be consulted.
 */
export function parseIntent(query: string, ctx: IntentContext): AiPlan | null {
  const q = query.toLowerCase().trim();
  const all = ctx.columns.map((c) => c.id);
  const emailCols = ctx.columns.filter(looksLikeEmailCol).map((c) => c.id);

  // Extract domain from emails/URLs
  if (/(extract|get|pull|find)\b.*\bdomain\b|\bdomain\b.*\bfrom\b/.test(q)) {
    const targets = emailCols.length > 0 ? emailCols : all;
    if (targets.length === 0) return null;
    return replaceInColumns(
      targets,
      extractDomain,
      "extract-domain",
      "Extract company domain",
    );
  }

  // Whitespace normalization
  if (
    /(normali[sz]e|clean|fix|remove|strip)\b.*(\bwhitespace\b|\bspace(s)?\b)|\bwhitespace\b/.test(
      q,
    )
  ) {
    const targets = all;
    return replaceInColumns(
      targets,
      normalizeWhitespace,
      "normalize-whitespace",
      "Normalize whitespace",
    );
  }

  // Trim
  if (/^trim\b|\btrim\s*(the\s*)?(cells?|columns?|values?)?$/.test(q)) {
    return replaceInColumns(all, (v) => v.trim(), "trim", "Trim whitespace");
  }

  // Case transforms
  if (/\blower[\s-]?case\b|\blowercase\b/.test(q)) {
    return replaceInColumns(all, (v) => v.toLowerCase(), "lowercase", "Lowercase");
  }
  if (/\bupper[\s-]?case\b|\buppercase\b/.test(q)) {
    return replaceInColumns(all, (v) => v.toUpperCase(), "uppercase", "Uppercase");
  }
  if (/\btitle[\s-]?case\b|\bproper[\s-]?case\b/.test(q)) {
    return replaceInColumns(all, titleCase, "title-case", "Title case");
  }

  // Round numbers
  const roundMatch = q.match(/\bround\b.*?(\d+)?\s*(decimal|place)/);
  if (roundMatch || /^round\b/.test(q)) {
    const decimals = roundMatch?.[1] ? Number(roundMatch[1]) : 0;
    const numericCols = ctx.columns.filter((c) => c.type === "number").map((c) => c.id);
    const targets = numericCols.length > 0 ? numericCols : all;
    return replaceInColumns(
      targets,
      (v) => roundNumber(v, decimals),
      "round",
      `Round numbers${decimals ? ` to ${decimals} decimals` : ""}`,
    );
  }

  // Strip currency symbols → plain numbers
  if (/(remove|strip|drop)\b.*(currency|\$|€|£)|(currency|money).*number/.test(q)) {
    const currencyCols = ctx.columns
      .filter((c) => c.values.slice(0, 30).some((v) => v && /[$€£]/.test(v)))
      .map((c) => c.id);
    const targets = currencyCols.length > 0 ? currencyCols : all;
    return replaceInColumns(
      targets,
      stripCurrency,
      "strip-currency",
      "Strip currency symbols",
    );
  }

  return null;
}

export type AnalysisResult = {
  label: string;
  lines: string[];
};

/** Deterministic analyses: missing values + duplicate rows report. */
export function runAnalysis(query: string, ctx: IntentContext): AnalysisResult | null {
  const q = query.toLowerCase();
  if (/(missing|blank|empty)/.test(q)) {
    const lines: string[] = [];
    let total = 0;
    for (const c of ctx.columns) {
      let blanks = 0;
      for (const v of c.values) if (v === null || v.trim() === "") blanks++;
      if (blanks > 0) {
        total += blanks;
        const pct = Math.round((blanks / Math.max(c.values.length, 1)) * 100);
        lines.push(`${c.name}: ${blanks.toLocaleString()} blank (${pct}%)`);
      }
    }
    return total === 0
      ? { label: "Missing values", lines: ["No blank cells found."] }
      : { label: `Missing values — ${total.toLocaleString()} blank cells`, lines };
  }
  if (/duplicate/.test(q)) {
    const seen = new Set<string>();
    let dupes = 0;
    const rowCount = ctx.columns[0]?.values.length ?? 0;
    for (let r = 0; r < rowCount; r++) {
      const key = ctx.columns.map((c) => c.values[r] ?? "").join("\u0001");
      if (seen.has(key)) dupes++;
      else seen.add(key);
    }
    return {
      label: "Duplicate rows",
      lines:
        dupes === 0
          ? ["No fully duplicated rows found."]
          : [
              `${dupes.toLocaleString()} duplicate ${dupes === 1 ? "row" : "rows"} detected.`,
              "Tip: ask AI to classify or flag them in a new column.",
            ],
    };
  }
  return null;
}

export function makeLlmPlan(
  query: string,
  ctx: IntentContext,
  opts: { targetColNames?: string[]; scopeLabel?: string } = {},
): AiPlan {
  const targetCols =
    opts.targetColNames ?? (ctx.columns.length <= 4 ? ctx.columns.map((c) => c.name) : []);
  const inputHint =
    targetCols.length > 0
      ? `Use the column(s): ${targetCols.join(", ")}.`
      : "Relevant data is attached per row.";
  return {
    id: uid("plan"),
    title: query.length > 60 ? `${query.slice(0, 57)}…` : query,
    instruction: query,
    strategy: "llm",
    rowTemplate: query,
    targetColIds: [],
    output: { mode: "new-column", name: suggestColumnName(query) },
    inputHint,
  };
}

function suggestColumnName(query: string): string {
  const stop = new Set([
    "a",
    "an",
    "the",
    "create",
    "add",
    "make",
    "generate",
    "write",
    "column",
    "col",
    "for",
    "each",
    "every",
    "row",
    "with",
    "from",
    "into",
    "of",
    "to",
    "me",
    "my",
    "please",
    "using",
    "based",
    "on",
    "this",
    "these",
    "that",
    "data",
    "all",
  ]);
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w && !stop.has(w))
    .slice(0, 3);
  if (words.length === 0) return "AI Result";
  return words.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}
