/// <reference lib="webworker" />
import { parseCsvText } from "../lib/dataset/csvParse";
import type { ParseProgress } from "../types";

/**
 * Parse CSV text off the main thread. All parsing logic lives in
 * lib/dataset/csvParse.ts so it can be unit-tested and reused as a
 * main-thread fallback if the worker cannot start.
 */
self.addEventListener("message", (e: MessageEvent<{ text: string }>) => {
  try {
    const result = parseCsvText(e.data.text, {
      onProgress: (rows) => {
        const msg: ParseProgress = { rows, bytes: -1 };
        self.postMessage({ type: "progress", payload: msg });
      },
    });
    self.postMessage({ type: "done", payload: result });
  } catch (err) {
    self.postMessage({
      type: "error",
      payload: err instanceof Error ? err.message : "Failed to parse CSV",
    });
  }
});
