import {
  Bold,
  Download,
  Italic,
  Redo2,
  SearchX,
  Sigma,
  Sparkles,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { downloadCsv } from "../features/export/exportCsv";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";
import { cn } from "../lib/utils";

const TOOL_BUTTON =
  "flex h-7 w-7 items-center justify-center rounded-sm text-text-2 hover:bg-surface-3 hover:text-text-1 disabled:opacity-40 disabled:pointer-events-none";

export function Toolbar() {
  const canUndo = useSheet((s) => s.past.length > 0);
  const canRedo = useSheet((s) => s.future.length > 0);
  const undo = useSheet((s) => s.undo);
  const redo = useSheet((s) => s.redo);
  const [zoom, setZoom] = useState(100);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [strike, setStrike] = useState(false);

  return (
    <div className="flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line-subtle bg-surface-1 px-2">
      <button
        type="button"
        className={TOOL_BUTTON}
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <Undo2 size={15} />
      </button>
      <button
        type="button"
        className={TOOL_BUTTON}
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <Redo2 size={15} />
      </button>

      <Sep />

      <div className="flex h-7 items-center gap-1 rounded-sm border border-line bg-surface-2 px-2 text-[12px] text-text-2">
        <span className="num">{zoom}%</span>
        <ZoomSlider value={zoom} onChange={setZoom} />
      </div>

      <Sep />

      <button
        type="button"
        aria-label="Bold"
        className={cn(TOOL_BUTTON, bold && "bg-accent-muted text-accent")}
        onClick={() => setBold((b) => !b)}
        title="Bold (Ctrl+B)"
      >
        <Bold size={14} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        aria-label="Italic"
        className={cn(TOOL_BUTTON, italic && "bg-accent-muted text-accent")}
        onClick={() => setItalic((i) => !i)}
        title="Italic (Ctrl+I)"
      >
        <Italic size={14} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        aria-label="Strikethrough"
        className={cn(TOOL_BUTTON, strike && "bg-accent-muted text-accent")}
        onClick={() => setStrike((s) => !s)}
        title="Strikethrough"
      >
        <Strikethrough size={14} strokeWidth={2.2} />
      </button>

      <Sep />

      <button
        type="button"
        aria-label="Functions"
        title="Σ — AI · Σ summarize column"
        className={TOOL_BUTTON}
        onClick={() => useUi.getState().setCommandBarOpen(true)}
      >
        <Sigma size={15} />
      </button>

      <Sep />

      <button
        type="button"
        aria-label="Find missing values"
        className={TOOL_BUTTON}
        title="Missing value scan"
        onClick={() => toast.success("Open ⌘K → find missing values")}
      >
        <SearchX size={15} />
      </button>

      <button
        type="button"
        aria-label="Export"
        className={TOOL_BUTTON}
        title="Export as CSV"
        onClick={() =>
          downloadCsv(
            useSheet.getState().columns,
            useSheet.getState().meta?.name ?? "dataset",
          )
        }
      >
        <Download size={15} />
      </button>

      <button
        type="button"
        className="ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-sm bg-accent px-2.5 text-[12px] font-medium text-black hover:brightness-110"
        onClick={() => useUi.getState().setCommandBarOpen(true)}
      >
        <Sparkles size={13} />
        Ask AI
      </button>
    </div>
  );
}

function Sep() {
  return <div className="mx-1 h-4 w-px shrink-0 bg-line-subtle" />;
}

function ZoomSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      min={50}
      max={200}
      step={10}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1 w-16 cursor-pointer accent-accent"
      aria-label="Zoom"
      title="Zoom"
    />
  );
}
