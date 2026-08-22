import { Download, History, Redo2, Settings2, Sparkles, Undo2 } from "lucide-react";
import { Button, Kbd } from "../components/ui/Button";
import { loadProviderConfig } from "../features/ai/provider";
import { downloadCsv } from "../features/export/exportCsv";
import { LogoMark } from "../features/import/ImportScreen";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";

export function TopBar() {
  const meta = useSheet((s) => s.meta);
  const canUndo = useSheet((s) => s.past.length > 0);
  const canRedo = useSheet((s) => s.future.length > 0);
  const undo = useSheet((s) => s.undo);
  const redo = useSheet((s) => s.redo);
  const setCommandBarOpen = useUi((s) => s.setCommandBarOpen);
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  const setHistoryOpen = useUi((s) => s.setHistoryOpen);

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line-subtle bg-surface-1 px-3">
      <div className="flex items-center gap-2">
        <LogoMark size={20} />
        <span className="text-[13px] font-semibold tracking-tight">EchoSheets</span>
      </div>

      <div className="mx-1 h-4 w-px bg-line-subtle" />

      <span className="max-w-52 truncate text-[12px] text-text-2" title={meta?.name}>
        {meta?.name}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHistoryOpen(true)}
          title="Operation history"
        >
          <History size={14} /> History
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCommandBarOpen(true)}
          className="ml-1"
        >
          <Sparkles size={13} />
          Ask AI
          <span className="ml-1 hidden sm:flex items-center opacity-80">
            <Kbd>⌘K</Kbd>
          </span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              useSheet.getState().columns,
              useSheet.getState().meta?.name ?? "dataset",
            )
          }
          title="Export as CSV"
        >
          <Download size={14} /> Export
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          aria-label="AI provider settings"
          title={loadProviderConfig() ? "AI provider connected" : "Connect AI provider"}
        >
          <span
            className={`mr-0.5 h-1.5 w-1.5 rounded-full ${
              loadProviderConfig() ? "bg-success-fg" : "bg-text-disabled"
            }`}
          />
          <Settings2 size={14} />
        </Button>
      </div>
    </header>
  );
}
