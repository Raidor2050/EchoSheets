import { serializeCsv } from "../../lib/dataset/serializeCsv";
import type { Column } from "../../types";

/**
 * Export the dataset as a downloadable CSV. Formula-injection sanitization is
 * on by default (leading =,+,-,@ and control chars get an apostrophe prefix).
 */
export function downloadCsv(columns: Column[], name: string): void {
  const csv = serializeCsv(columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const base = name.replace(/\.[^.]+$/, "") || "dataset";
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}-echosheets.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
