import type { ParseResult } from "./csvParse";

export type { ParseResult };
export type ProgressHandler = (rows: number) => void;

type WorkerMessage =
  | { type: "progress"; payload: { rows: number } }
  | { type: "done"; payload: ParseResult }
  | { type: "error"; payload: string };

/**
 * Parse CSV text off the main thread. The worker reports progress every
 * ~25k rows and resolves once with a column-major result.
 *
 * If the worker cannot start or its script fails to load (blocked, missing
 * chunk, exotic environment), we transparently fall back to parsing on the
 * main thread with the exact same parser so imports never hard-fail.
 */
export async function parseCsvInWorker(
  text: string,
  onProgress?: ProgressHandler,
): Promise<ParseResult> {
  try {
    return await runInWorker(text, onProgress);
  } catch (err) {
    if (err instanceof WorkerStartupError) {
      console.warn("CSV worker unavailable — falling back to main-thread parse", err.cause);
      const { parseCsvText } = await import("./csvParse");
      return parseCsvText(text, { onProgress });
    }
    throw err;
  }
}

class WorkerStartupError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "WorkerStartupError";
    this.cause = cause;
  }
}

function runInWorker(text: string, onProgress?: ProgressHandler): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../../workers/csv-parse.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch (err) {
      reject(new WorkerStartupError("Worker construction failed", err));
      return;
    }

    const cleanup = () => worker.terminate();

    worker.addEventListener("message", (e: MessageEvent<WorkerMessage>) => {
      const { type, payload } = e.data;
      if (type === "progress") {
        onProgress?.(payload.rows);
      } else if (type === "done") {
        cleanup();
        resolve(payload);
      } else if (type === "error") {
        cleanup();
        // The worker loaded fine; the CSV content itself failed to parse.
        reject(new Error(payload || "Failed to parse CSV"));
      }
    });

    worker.addEventListener("error", (e) => {
      cleanup();
      // Script-level failure (404, CSP block, module eval error) — the
      // caller decides whether to fall back to the main thread.
      reject(new WorkerStartupError(e.message || "CSV parser failed to start", e.error));
    });

    worker.postMessage({ text });
  });
}
