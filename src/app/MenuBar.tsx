import { Download, History, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "../components/ui/Menu";
import { runQuery, selectedColumnIds } from "../features/ai/runQuery";
import { downloadCsv } from "../features/export/exportCsv";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";

function runQuick(query: string) {
  const out = runQuery(query, selectedColumnIds());
  if (out.kind === "noop") toast.warning(out.message ?? "Nothing to do.");
  else toast.success(out.message ?? "Running…");
}

export function MenuBar() {
  return (
    <nav className="flex h-7 shrink-0 items-center gap-0.5 border-b border-line-subtle bg-surface-1 px-2">
      <MenuItemShell label="File">
        <MenuItem accent onSelect={() => useUi.getState().setCommandBarOpen(true)}>
          ✦ Ask AI… <span className="ml-auto text-[10.5px] text-text-3">⌘K</span>
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          hint="⌘Z"
          onSelect={() =>
            downloadCsv(
              useSheet.getState().columns,
              useSheet.getState().meta?.name ?? "dataset",
            )
          }
        >
          <Download size={13} />
          Export as CSV
        </MenuItem>
        <MenuItem onSelect={() => useUi.getState().setSettingsOpen(true)}>
          Connect AI provider…
        </MenuItem>
      </MenuItemShell>

      <MenuItemShell label="Edit">
        <MenuItem hint="⌘Z" onSelect={() => useSheet.getState().undo()}>
          <Undo2 size={13} />
          Undo
        </MenuItem>
        <MenuItem hint="⌘⇧Z" onSelect={() => useSheet.getState().redo()}>
          <Redo2 size={13} />
          Redo
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => useUi.getState().setHistoryOpen(true)}>
          <History size={13} />
          Operation history
        </MenuItem>
      </MenuItemShell>

      <MenuItemShell label="View">
        <MenuItem onSelect={() => useUi.getState().setCommandBarOpen(true)}>
          <RotateCcw size={13} />
          AI command palette
        </MenuItem>
      </MenuItemShell>

      <MenuItemShell label="Format">
        <MenuLabel>Data cleanup</MenuLabel>
        <MenuItem onSelect={() => runQuick("trim whitespace")}>
          <RotateCcw size={13} />
          Trim whitespace
        </MenuItem>
        <MenuItem onSelect={() => runQuick("normalize whitespace in all cells")}>
          <RotateCcw size={13} />
          Normalize whitespace
        </MenuItem>
        <MenuItem onSelect={() => runQuick("title case every column")}>
          <RotateCcw size={13} />
          Title case
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => runQuick("find missing values")}>
          Find missing values
        </MenuItem>
        <MenuItem onSelect={() => runQuick("round numbers")}>Round numbers</MenuItem>
      </MenuItemShell>

      <MenuItemShell label="Data">
        <MenuItem accent onSelect={() => useUi.getState().setCommandBarOpen(true)}>
          ✦ Ask AI to transform…
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => runQuick("find missing values")}>
          Missing value scan
        </MenuItem>
        <MenuItem onSelect={() => runQuick("find duplicates")}>Duplicate rows</MenuItem>
      </MenuItemShell>

      <span className="ml-auto hidden items-center gap-2 pr-1 text-[11px] text-text-3 sm:flex">
        <span className="inline-flex h-2 w-2 rounded-full bg-success-fg" />
        All changes previewed before apply
      </span>
    </nav>
  );
}

function MenuItemShell({ label, children }: { label: string; children: React.ReactNode }) {
  return <Menu trigger={<MenuButton label={label} />}>{children}</Menu>;
}

function MenuButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-sm px-2 py-1 text-[12.5px] text-text-2 hover:bg-surface-3 hover:text-text-1"
    >
      {label}
    </button>
  );
}
