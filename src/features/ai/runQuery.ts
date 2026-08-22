import { useSheet } from "../../lib/dataset/store";
import { useUi } from "../../lib/uiStore";
import type { Column } from "../../types";
import { executePlan } from "./executor";
import { type AnalysisResult, makeLlmPlan, parseIntent, runAnalysis } from "./intent";

export interface RunOutcome {
  kind: "started" | "analysis" | "noop";
  message?: string;
  analysis?: AnalysisResult;
}

/**
 * Central natural-language entry point. Tries the deterministic fast path,
 * then local analyses, then falls back to an LLM plan.
 */
export function runQuery(query: string, targetColIds: string[]): RunOutcome {
  const trimmed = query.trim();
  if (!trimmed) return { kind: "noop", message: "Type an instruction first." };

  const { meta, columns } = useSheet.getState();
  const setUi = useUi.getState().setCommandBarOpen;
  if (!meta || columns.length === 0)
    return { kind: "noop", message: "Import a dataset first." };

  const ctx = { meta, columns };
  const scopedCtx = scopeContext(ctx.columns, targetColIds);

  const plan = parseIntent(trimmed, scopedCtx);
  if (plan) {
    void executePlan(plan);
    setUi(false);
    return {
      kind: "started",
      message: `${plan.title} — review the preview before applying.`,
    };
  }

  const analysis = runAnalysis(trimmed, scopedCtx);
  if (analysis) {
    setUi(false);
    return { kind: "analysis", analysis };
  }

  const llmPlan = makeLlmPlan(trimmed, ctx, {
    targetColNames: colNamesFor(ctx.columns, targetColIds),
  });
  void executePlan(llmPlan);
  setUi(false);
  return {
    kind: "started",
    message: `${llmPlan.title} — review the preview before applying.`,
  };
}

function scopeContext(columns: Column[], targetColIds: string[]) {
  if (targetColIds.length === 0) return { meta: useSheet.getState().meta!, columns };
  const filtered = columns.filter((c) => targetColIds.includes(c.id));
  return {
    meta: useSheet.getState().meta!,
    columns: filtered.length > 0 ? filtered : columns,
  };
}

export function colNamesFor(columns: Column[], targetColIds: string[]): string[] {
  if (targetColIds.length === 0) return [];
  return columns.filter((c) => targetColIds.includes(c.id)).map((c) => c.name);
}

/** Resolve which column ids the current UI selection implies. */
export function selectedColumnIds(): string[] {
  const { columns } = useSheet.getState();
  const sel = useUi.getState().selection;
  switch (sel.kind) {
    case "cols": {
      const out: string[] = [];
      for (let i = sel.from; i <= Math.min(sel.to, columns.length - 1); i++)
        out.push(columns[i]?.id ?? "");
      return out.filter(Boolean);
    }
    case "range":
    case "cell": {
      const c0 = sel.kind === "cell" ? sel.col : sel.rect.c0;
      const c1 = sel.kind === "cell" ? sel.col : sel.rect.c1;
      const out: string[] = [];
      for (let i = c0; i <= Math.min(c1, columns.length - 1); i++)
        out.push(columns[i]?.id ?? "");
      return out.filter(Boolean);
    }
    default:
      return [];
  }
}
