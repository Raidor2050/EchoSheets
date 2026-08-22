import { toast } from "sonner";
import { useSheet } from "../../lib/dataset/store";
import type { AiPlan, Column, OutputMode } from "../../types";
import { loadProviderConfig, type ProviderConfig, runLlmBatch } from "./provider";
import { useStaging } from "./stagingStore";

const LLM_BATCH_SIZE = 10;
const CONCURRENCY = 3;
const MAX_RETRIES = 2;

let activeController: AbortController | null = null;

export function cancelRunningOp(): void {
  activeController?.abort();
  useStaging.getState().cancel();
}

/** Run a plan against the current dataset. Results stream into staging. */
export async function executePlan(plan: AiPlan): Promise<void> {
  const sheet = useSheet.getState();
  if (!sheet.meta) return;

  const staging = useStaging.getState();
  const rows = targetRows(plan, sheet.columns);
  const output: OutputMode =
    plan.output.mode === "new-column"
      ? {
          mode: "new-column",
          name: uniqueColumnName(sheet.columns, plan.output.name),
        }
      : { mode: "replace" };

  staging.begin({
    title: plan.title,
    instruction: plan.instruction,
    strategy: plan.strategy === "llm" ? "llm" : "deterministic",
    model: plan.strategy === "llm" ? (loadProviderConfig()?.model ?? null) : null,
    output,
    targetColIds: plan.targetColIds,
    totalRows: rows.length,
    plan,
  });

  if (plan.strategy === "deterministic") {
    await runDeterministic(plan, rows);
  } else if (plan.strategy === "llm") {
    await runLlm(plan, rows);
  } else {
    useStaging.getState().setRunning(false);
  }
}

function targetRows(_plan: AiPlan, columns: Column[]): number[] {
  void _plan;
  const rowCount = columns[0]?.values.length ?? 0;
  return Array.from({ length: rowCount }, (_, i) => i);
}

function uniqueColumnName(columns: Column[], base: string): string {
  const names = new Set(columns.map((c) => c.name.toLowerCase()));
  let name = base;
  let n = 2;
  while (names.has(name.toLowerCase())) name = `${base} ${n++}`;
  return name;
}

async function runDeterministic(plan: AiPlan, rows: number[]): Promise<void> {
  const fn = plan.fn;
  const staging = useStaging.getState();
  if (!fn) {
    staging.cancel();
    return;
  }
  const sheet = useSheet.getState();
  const columns = sheet.columns.filter((c) => plan.targetColIds.includes(c.id));

  // Yield to the event loop every CHUNK rows so the UI stays at 60fps.
  const CHUNK = 4000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    if (useStaging.getState().cancelled) return;
    for (let j = i; j < Math.min(i + CHUNK, rows.length); j++) {
      const row = rows[j] ?? 0;
      const firstCol = columns[0];
      const primaryValue = firstCol?.values[row] ?? "";
      const rowValues: Record<string, string | null> = {};
      for (const c of columns) rowValues[c.name] = c.values[row] ?? null;
      try {
        const out = fn(primaryValue, rowValues);
        staging.setCell(row, {
          value: out ?? "",
          status: out === null ? "error" : "ok",
          error: out === null ? "Could not parse value" : undefined,
        });
      } catch {
        staging.setCell(row, {
          value: "",
          status: "error",
          error: "Transform failed",
        });
      }
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  staging.setRunning(false);
}

async function runLlm(plan: AiPlan, rows: number[]): Promise<void> {
  const cfg: ProviderConfig | null = loadProviderConfig();
  const staging = useStaging.getState();

  if (!cfg) {
    for (const row of rows.slice(0, 1)) {
      staging.setCell(row, {
        value: "",
        status: "error",
        error:
          "No AI provider connected. Open Settings (⌘,) and add an API key to run AI operations.",
      });
    }
    staging.setRunning(false);
    return;
  }

  activeController = new AbortController();
  const signal = activeController.signal;
  const sheet = useSheet.getState();
  const columns = sheet.columns;

  // Mark everything pending so the grid shows live coverage.
  for (const r of rows) staging.setCell(r, { value: "", status: "pending" });

  const batches: number[][] = [];
  for (let i = 0; i < rows.length; i += LLM_BATCH_SIZE)
    batches.push(rows.slice(i, i + LLM_BATCH_SIZE));

  let nextBatch = 0;
  let rateLimitedDelay = false;

  const worker = async (): Promise<void> => {
    while (nextBatch < batches.length && !signal.aborted) {
      const index = nextBatch++;
      const batch = batches[index];
      if (!batch) break;

      let attempt = 0;
      for (;;) {
        if (signal.aborted) return;
        try {
          const result = await runLlmBatch(cfg, plan, columns, batch, signal);
          const s = useStaging.getState();
          for (const r of batch)
            s.setCell(r, {
              value: result.values.get(r) ?? "",
              status: result.values.has(r) ? "ok" : "error",
              error: result.values.has(r) ? undefined : "Missing in model response",
            });
          break;
        } catch (err) {
          if (signal.aborted) return;
          const isRateLimited =
            typeof err === "object" && err !== null && "rateLimited" in err;
          const transient = isRateLimited || isNetworkError(err);
          if (transient && attempt < MAX_RETRIES) {
            attempt++;
            const delay = isRateLimited ? 2000 * 2 ** attempt : 800 * 2 ** attempt;
            if (isRateLimited) rateLimitedDelay = true;
            await sleep(delay);
            continue;
          }
          const s = useStaging.getState();
          for (const r of batch)
            s.setCell(r, {
              value: "",
              status: "error",
              error: err instanceof Error ? err.message : "Unknown error",
            });
          break;
        }
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()),
  );

  void rateLimitedDelay;
  activeController = null;
  useStaging.getState().setRunning(false);
}

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error && /network|fetch|failed/i.test(err.message))
  );
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Retry only the failed cells of the current staged operation.
 * Deterministic failures re-run the transform; LLM failures re-query in
 * fresh batches. Excluded/ok cells are left untouched.
 */
export async function retryFailed(): Promise<void> {
  const staging = useStaging.getState();
  if (!staging.active || !staging.plan) return;
  const failedRows: number[] = [];
  for (const [row, cell] of staging.cells)
    if (cell.status === "error") failedRows.push(row);
  if (failedRows.length === 0) {
    toast.info("No failed cells to retry.");
    return;
  }

  const plan = staging.plan;
  if (plan.strategy === "deterministic" && plan.fn) {
    const sheet = useSheet.getState();
    const columns = sheet.columns.filter((c) => plan.targetColIds.includes(c.id));
    for (const row of failedRows) {
      const firstCol = columns[0];
      const primaryValue = firstCol?.values[row] ?? "";
      const rowValues: Record<string, string | null> = {};
      for (const c of columns) rowValues[c.name] = c.values[row] ?? null;
      try {
        const out = plan.fn(primaryValue, rowValues);
        useStaging.getState().setCell(row, {
          value: out ?? "",
          status: out === null ? "error" : "ok",
          error: out === null ? "Could not parse value" : undefined,
        });
      } catch {
        // leave as failed
      }
    }
    toast.success(
      `Retried ${failedRows.length} ${failedRows.length === 1 ? "cell" : "cells"}.`,
    );
    return;
  }

  // LLM retry — clear errors to pending and re-run over just those rows.
  for (const row of failedRows)
    useStaging.getState().setCell(row, { value: "", status: "pending" });
  await runLlm(plan, failedRows);
}
