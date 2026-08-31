import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { CommandBar } from "../features/ai/CommandBar";
import { PreviewBar } from "../features/ai/PreviewBar";
import { DataGrid } from "../features/grid/DataGrid";
import { ImportScreen } from "../features/import/ImportScreen";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";
import { FormulaBar } from "./FormulaBar";
import { HistoryPanel } from "./HistoryPanel";
import { MenuBar } from "./MenuBar";
import { SettingsModal } from "./SettingsModal";
import { SheetTabs } from "./SheetTabs";
import { StatusBar } from "./StatusBar";
import { Toolbar } from "./Toolbar";
import { TopBar } from "./TopBar";

export function App() {
  const meta = useSheet((s) => s.meta);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const ui = useUi.getState();

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setCommandBarOpen(!ui.commandBarOpen);
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && !isTypingTarget(e.target)) {
        e.preventDefault();
        if (e.shiftKey) useSheet.getState().redo();
        else useSheet.getState().undo();
        return;
      }
      if (e.key === "Escape") {
        if (ui.commandBarOpen) ui.setCommandBarOpen(false);
        else if (ui.settingsOpen) ui.setSettingsOpen(false);
        else if (ui.historyOpen) ui.setHistoryOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full w-full flex-col">
        {!meta ? (
          <ImportScreen />
        ) : (
          <>
            <TopBar />
            <MenuBar />
            <Toolbar />
            <FormulaBar />
            <div className="min-h-0 flex-1">
              <DataGrid />
            </div>
            <PreviewBar />
            <SheetTabs />
            <StatusBar />
          </>
        )}
        <CommandBar />
        <SettingsModal />
        <HistoryPanel />
      </div>
      <Toaster
        theme="dark"
        position="bottom-right"
        offset={44}
        toastOptions={{
          style: {
            background: "#101013",
            border: "1px solid #232329",
            color: "#f2f2f3",
            fontSize: "12.5px",
          },
        }}
      />
    </MotionConfig>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable ||
    // GDG renders its editor as a textarea inside the grid surface.
    target.closest("[data-testid='gdg-editor']") !== null ||
    (target.closest(".clip-grid-cell") !== null && target.tagName === "TEXTAREA")
  );
}
