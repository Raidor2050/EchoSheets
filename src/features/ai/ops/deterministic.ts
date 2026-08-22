import type { AiPlan } from "../../../types";

/**
 * Deterministic (non-LLM) transforms. These run locally, instantly, free —
 * the "fast path" of the intent parser.
 */

export const extractDomain = (value: string): string | null => {
  const m = value.match(/@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/);
  if (m?.[1]) return m[1].toLowerCase();
  const url = value.match(/https?:\/\/([^/\s]+)/);
  return url?.[1]?.toLowerCase() ?? null;
};

export const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .replace(
      /(^|[\s\-'.&])(\p{L})/gu,
      (_m, p1: string, p2: string) => p1 + p2.toUpperCase(),
    );

export const roundNumber = (value: string, decimals = 0): string | null => {
  const n = Number(value.replace(/[,\s]/g, "").replace(/%$/, ""));
  if (!Number.isFinite(n)) return null;
  return String(Number(n.toFixed(decimals)));
};

export const stripCurrency = (value: string): string | null => {
  const m = value.match(/-?\d[\d,]*(\.\d+)?/);
  if (!m) return null;
  return String(Number(m[0].replace(/,/g, "")));
};

/** Build a row-values lookup for multi-column deterministic ops. */
export type RowValues = Record<string, string | null>;

export function planFromFn(
  id: string,
  title: string,
  instruction: string,
  targetColIds: string[],
  fn: AiPlan["fn"],
  output: AiPlan["output"],
): AiPlan {
  return {
    id,
    title,
    instruction,
    strategy: "deterministic",
    targetColIds,
    output,
    fn,
  };
}
