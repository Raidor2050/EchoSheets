import type { ColumnType } from "../../types";

const NUMBER_RE = /^[+-]?(\d{1,3}(,\d{3})*|\d+)(\.\d+)?%?$/;
const DATE_RE =
  /^\d{4}-\d{2}(-\d{2})?([T ]\d{2}:\d{2}(:\d{2})?)?Z?$|^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const BOOLEAN_VALUES = new Set(["true", "false", "yes", "no", "y", "n"]);

export interface ColumnProfile {
  type: ColumnType;
  filled: number;
  blanks: number;
  unique: number;
}

/**
 * Infer a column's type from a sample of its values.
 * Empty columns → "empty"; majority-numeric → "number"; etc.
 */
export function inferColumnType(values: (string | null)[]): ColumnProfile {
  let filled = 0;
  let numeric = 0;
  let dates = 0;
  let bools = 0;
  const seen = new Set<string>();

  const sampleSize = Math.min(values.length, 1000);
  for (let i = 0; i < sampleSize; i++) {
    const v = values[i];
    if (v === null || v === undefined || v.trim() === "") continue;
    filled++;
    seen.add(v);
    const t = v.trim();
    if (NUMBER_RE.test(t)) numeric++;
    if (DATE_RE.test(t)) dates++;
    if (BOOLEAN_VALUES.has(t.toLowerCase())) bools++;
  }

  if (filled === 0) return { type: "empty", filled: 0, blanks: values.length, unique: 0 };

  let type: ColumnType = "text";
  if (bools / filled > 0.9) type = "boolean";
  else if (dates / filled > 0.8 && dates >= numeric) type = "date";
  else if (numeric / filled > 0.8) type = "number";

  return {
    type,
    filled,
    blanks: values.length - filled,
    unique: seen.size,
  };
}

/** Human label for a detected type, used in the dataset summary UI. */
export function typeLabel(type: ColumnType): string {
  switch (type) {
    case "number":
      return "Number";
    case "date":
      return "Date";
    case "boolean":
      return "Boolean";
    case "empty":
      return "Empty";
    default:
      return "Text";
  }
}
