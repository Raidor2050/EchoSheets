import {
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { inferColumnType, typeLabel } from "../../lib/dataset/inferTypes";
import { parseCsvInWorker } from "../../lib/dataset/parseBridge";
import { useSheet } from "../../lib/dataset/store";
import { formatBytes, formatNumber } from "../../lib/utils";
import { generateSampleCsv } from "./sampleData";

interface Summary {
  name: string;
  sizeBytes: number;
  rowCount: number;
  colCount: number;
  headers: string[];
  columns: (string | null)[][];
  types: string[];
}

const MAX_BYTES = 200 * 1024 * 1024;

export function ImportScreen() {
  const [state, setState] = useState<"idle" | "parsing" | "ready" | "error">("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadDataset = useSheet((s) => s.loadDataset);
  const reduceMotion = useReducedMotion();

  const ingest = useCallback(async (text: string, name: string, sizeBytes: number) => {
    if (sizeBytes > MAX_BYTES) {
      setError("File is larger than 200 MB. Split it or export fewer rows.");
      setState("error");
      return;
    }
    setState("parsing");
    try {
      const result = await parseCsvInWorker(text);
      if (!result.headers.length || !result.rowCount) {
        setError("That file has no data rows we could read.");
        setState("error");
        return;
      }
      const types = result.columns.map((vals) => typeLabel(inferColumnType(vals).type));
      setSummary({
        name,
        sizeBytes,
        rowCount: result.rowCount,
        colCount: result.headers.length,
        headers: result.headers,
        columns: result.columns,
        types,
      });
      setState("ready");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't parse that CSV: ${err.message}`
          : "Couldn't parse that CSV.",
      );
      setState("error");
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
        setError("Please choose a .csv, .tsv or .txt file.");
        setState("error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => void ingest(String(reader.result ?? ""), file.name, file.size);
      reader.onerror = () => {
        setError("Could not read the file from disk.");
        setState("error");
      };
      reader.readAsText(file);
    },
    [ingest],
  );

  const openSample = useCallback(() => {
    const { text, name } = generateSampleCsv();
    void ingest(text, name, new TextEncoder().encode(text).length);
  }, [ingest]);

  const openInEditor = useCallback(() => {
    if (!summary) return;
    loadDataset(
      { headers: summary.headers, columns: summary.columns },
      summary.name,
      summary.sizeBytes,
    );
  }, [summary, loadDataset]);

  if (state === "ready" && summary)
    return (
      <ReadySummary
        summary={summary}
        onBack={() => {
          setState("idle");
          setSummary(null);
        }}
        onOpen={openInEditor}
      />
    );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full max-w-xl flex-col items-center"
      >
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark />
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">EchoSheets</h1>
            <p className="text-[12px] text-text-3">The AI-native spreadsheet</p>
          </div>
        </div>

        {state === "idle" && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={
                dragging
                  ? "group flex h-56 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-accent/60 bg-accent-muted transition-colors"
                  : "group flex h-56 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-line bg-surface-1/40 transition-colors hover:border-line-strong hover:bg-surface-1"
              }
            >
              <span
                className={
                  dragging
                    ? "flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted text-accent"
                    : "flex h-11 w-11 items-center justify-center rounded-full bg-surface-3 text-text-2 group-hover:text-accent transition-colors"
                }
              >
                <Upload size={20} strokeWidth={1.75} />
              </span>
              <span className="text-[14px] font-medium">
                Drop a CSV here, or click to browse
              </span>
              <span className="text-[12px] text-text-3">
                Up to 200 MB · parsed locally, your file never leaves this device
              </span>
            </button>

            <div className="mt-5 flex items-center gap-3 text-[12px] text-text-3">
              <span>or</span>
              <Button variant="outline" size="sm" onClick={openSample}>
                <Sparkles size={13} /> Try the sample dataset
              </Button>
            </div>

            <p className="mt-10 max-w-sm text-center text-[12px] leading-relaxed text-text-3">
              Clean messy columns, extract entities, classify rows and generate summaries
              with natural language. Preview every change before it touches your data.
            </p>
          </>
        )}

        {state === "parsing" && (
          <div className="flex h-56 w-full flex-col items-center justify-center gap-4 rounded-md border border-line bg-surface-1/40">
            <Loader2 size={22} className="animate-spin text-accent" />
            <div className="text-[13px]">Parsing CSV…</div>
            <div className="text-[12px] text-text-3">
              Running off the main thread — large files welcome
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="flex h-56 w-full flex-col items-center justify-center gap-4 rounded-md border border-danger/30 bg-danger/5 px-8">
            <AlertTriangle size={22} className="text-danger-fg" />
            <div className="text-center text-[13px] leading-relaxed">{error}</div>
            <Button variant="outline" size="sm" onClick={() => setState("idle")}>
              Try another file
            </Button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </motion.div>
    </div>
  );
}

function ReadySummary(props: { summary: Summary; onBack: () => void; onOpen: () => void }) {
  const { summary, onBack, onOpen } = props;
  const suggestions = [
    "Normalize whitespace across all columns",
    "Extract company domain from emails",
    "Find missing values",
    "Title case every column",
  ];
  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg rounded-md border border-line bg-surface-1 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-surface-3 text-accent">
            <FileSpreadsheet size={18} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium">{summary.name}</div>
            <div className="num mt-0.5 text-[12px] text-text-2">
              {formatNumber(summary.rowCount)} rows · {summary.colCount} columns ·{" "}
              {formatBytes(summary.sizeBytes)}
            </div>
          </div>
        </div>

        <div className="mt-4 max-h-44 overflow-y-auto rounded-sm border border-line-subtle">
          <table className="w-full text-left text-[12px]">
            <tbody>
              {summary.headers.map((h, i) => (
                <tr
                  key={`${h}-${i}`}
                  className="border-b border-line-subtle last:border-b-0"
                >
                  <td className="max-w-52 truncate px-3 py-1.5 font-medium">{h}</td>
                  <td className="px-3 py-1.5 text-right text-text-3">{summary.types[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-[11px] font-medium uppercase tracking-wider text-text-3">
          Suggested first moves
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <span
              key={s}
              className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11.5px] text-text-2"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" onClick={onOpen}>
            Open in editor <ArrowRight size={14} />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#09090b" stroke="#232329" />
      <path
        d="M8 11h16M8 16h16M8 21h10"
        stroke="#52A9FF"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
