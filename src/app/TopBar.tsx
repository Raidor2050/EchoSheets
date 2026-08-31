import { Download, History, Settings2, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { loadProviderConfig } from "../features/ai/provider";
import { downloadCsv } from "../features/export/exportCsv";
import { LogoMark } from "../features/import/ImportScreen";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";

export function TopBar() {
  const meta = useSheet((s) => s.meta);
  const setCommandBarOpen = useUi((s) => s.setCommandBarOpen);
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  const setHistoryOpen = useUi((s) => s.setHistoryOpen);
  const connected = loadProviderConfig();

  return (
    <header className="flex h-11 shrink-0 items-center gap-2.5 border-b border-line-subtle bg-surface-1 px-3">
      <div className="flex items-center gap-2">
        <LogoMark size={22} />
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold tracking-tight text-text-1">
            EchoSheets
          </span>
          <span className="text-[10px] text-text-3">AI-native spreadsheet</span>
        </div>
      </div>

      <div className="mx-1 h-5 w-px bg-line-subtle" />

      <span className="max-w-52 truncate text-[12.5px] text-text-2" title={meta?.name}>
        {meta?.name ?? "Untitled dataset"}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHistoryOpen(true)}
          aria-label="History"
        >
          <History size={14} /> History
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
          aria-label="Export"
        >
          <Download size={14} /> Export
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCommandBarOpen(true)}
          className="ml-1"
        >
          <Sparkles size={13} />
          Ask AI
          <span className="hidden rounded-sm bg-black/20 px-1 text-[10px] font-semibold sm:inline">
            ⌘K
          </span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          aria-label="AI provider settings"
          title={connected ? "AI provider connected" : "Connect AI provider"}
        >
          <span
            className={`mr-0.5 h-1.5 w-1.5 rounded-full ${
              connected ? "bg-success-fg" : "bg-text-disabled"
            }`}
          />
          <Settings2 size={14} />
        </Button>
      </div>
    </header>
  );
}
