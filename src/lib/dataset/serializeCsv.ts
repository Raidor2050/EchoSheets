import type { Column } from "../../types";

/**
 * Neutralize spreadsheet formula injection (=, +, -, @ prefixes and tab/CR
 * leads) per OWASP guidance so exported files can't execute as formulas.
 */
export function sanitizeFormulaInjection(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

function quoteField(field: string): string {
  if (/[",\n\r]/.test(field)) return `"${field.replace(/"/g, '""')}"`;
  return field;
}

export interface SerializeOptions {
  sanitize?: boolean;
}

/** Serialize columns to RFC-4180 CSV text. */
export function serializeCsv(columns: Column[], opts: SerializeOptions = {}): string {
  const sanitize = opts.sanitize ?? true;
  const rows: string[] = [];
  rows.push(columns.map((c) => quoteField(c.name)).join(","));
  const rowCount = columns[0]?.values.length ?? 0;
  for (let r = 0; r < rowCount; r++) {
    const fields: string[] = [];
    for (const col of columns) {
      let v = col.values[r] ?? "";
      v = v === null ? "" : v;
      if (sanitize && v !== "") v = sanitizeFormulaInjection(v);
      fields.push(quoteField(v));
    }
    rows.push(fields.join(","));
  }
  return rows.join("\r\n");
}
