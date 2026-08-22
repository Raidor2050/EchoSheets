export interface ParseResult {
  headers: string[];
  columns: (string | null)[][];
  rowCount: number;
}

export type ProgressHandler = (rows: number) => void;

/**
 * Parse CSV text off the main thread. The worker reports progress every
 * ~25k rows and resolves once with a column-major result.
 */
export function parseCsvInWorker(
  text: string,
  onProgress?: ProgressHandler,
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../../workers/csv-parse.worker.ts", import.meta.url),
      { type: "module" },
    );
    const cleanup = () => worker.terminate();

    worker.addEventListener("message", (e: MessageEvent) => {
      const { type, payload } = e.data as {
        type: string;
        payload: unknown;
      };
      if (type === "progress") {
        const p = payload as { rows: number };
        onProgress?.(p.rows);
      } else if (type === "done") {
        cleanup();
        resolve(payload as ParseResult);
      } else if (type === "error") {
        cleanup();
        reject(new Error(String(payload)));
      }
    });

    worker.addEventListener("error", (e) => {
      cleanup();
      reject(new Error(e.message || "CSV parser failed to start"));
    });

    worker.postMessage({ text });
  });
}
