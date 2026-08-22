import { Command } from "cmdk";
import {
  ArrowDownUp,
  CaseSensitive,
  Download,
  Globe,
  History,
  Redo2,
  Scissors,
  SearchX,
  Settings2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Kbd } from "../../components/ui/Button";
import { useSheet } from "../../lib/dataset/store";
import { useUi } from "../../lib/uiStore";
import { downloadCsv } from "../export/exportCsv";
import { runQuery, selectedColumnIds } from "./runQuery";

export function CommandBar() {
  const open = useUi((s) => s.commandBarOpen);
  const setOpen = useUi((s) => s.setCommandBarOpen);
  const selection = useUi((s) => s.selection);
  const columns = useSheet((s) => s.columns);
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const scopeLabel = describeScope(selection);

  const quickOps = [
    {
      icon: <Sparkles size={14} className="text-accent" />,
      label: "Extract company domain from emails",
      query: "extract company domain",
      when: columns.some((c) => c.type === "text"),
    },
    {
      icon: <Scissors size={14} />,
      label: "Trim whitespace everywhere",
      query: "trim whitespace",
      when: true,
    },
    {
      icon: <ArrowDownUp size={14} />,
      label: "Normalize duplicate whitespace",
      query: "normalize whitespace in all cells",
      when: true,
    },
    {
      icon: <CaseSensitive size={14} />,
      label: "Title case all text",
      query: "title case every column",
      when: true,
    },
    {
      icon: <SearchX size={14} />,
      label: "Find missing values",
      query: "find missing values",
      when: true,
    },
    {
      icon: <Globe size={14} />,
      label: "Round all numbers to whole values",
      query: "round numbers",
      when: columns.some((c) => c.type === "number"),
    },
  ].filter((op) => op.when);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[14vh]"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-md border border-line bg-surface-2 shadow-[0_8px_32px_rgba(0,0,0,0.64)]"
          >
            <Command loop shouldFilter label="AI command bar">
              <div className="flex items-center gap-2.5 border-b border-line-subtle px-3.5">
                <Sparkles size={15} className="shrink-0 text-accent" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Ask AI — extract domains, classify leads, clean phones…"
                  className="h-12 w-full bg-transparent text-[13.5px] outline-none placeholder:text-text-disabled"
                />
                <Kbd>esc</Kbd>
              </div>

              <div className="flex items-center justify-between border-b border-line-subtle bg-surface-1 px-3.5 py-1.5 text-[11px] text-text-3">
                <span>
                  Scope · <span className="text-text-1">{scopeLabel}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>↑↓</Kbd> navigate <Kbd>↵</Kbd> run
                </span>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-1.5">
                <FreeTextItem query={query} />

                {quickOps.length > 0 && (
                  <Command.Group
                    heading="Deterministic · instant & free"
                    className="cmdk-group"
                  >
                    {quickOps.map((op) => (
                      <CmdItem
                        key={op.label}
                        value={`${op.label} deterministic`}
                        onSelect={() => announce(runQuery(op.query, selectedColumnIds()))}
                      >
                        {op.icon}
                        {op.label}
                      </CmdItem>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Actions" className="cmdk-group">
                  <UndoRedoItems />
                  <CmdItem
                    value="export csv download"
                    onSelect={() => {
                      setOpen(false);
                      downloadCsv(
                        useSheet.getState().columns,
                        useSheet.getState().meta?.name ?? "dataset",
                      );
                      toast.success("CSV exported");
                    }}
                  >
                    <Download size={14} /> Export as CSV
                  </CmdItem>
                  <CmdItem
                    value="history operation ledger"
                    onSelect={() => {
                      setOpen(false);
                      useUi.getState().setHistoryOpen(true);
                    }}
                  >
                    <History size={14} /> Open history
                  </CmdItem>
                  <CmdItem
                    value="settings provider api key model connect"
                    onSelect={() => {
                      setOpen(false);
                      useUi.getState().setSettingsOpen(true);
                    }}
                  >
                    <Settings2 size={14} /> Connect AI provider…
                  </CmdItem>
                </Command.Group>

                <Command.Empty>
                  <span className="block px-3 py-3 text-center text-[12px] text-text-3">
                    Press <Kbd>↵</Kbd> to run this instruction with AI
                  </span>
                </Command.Empty>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FreeTextItem({ query }: { query: string }) {
  if (!query.trim()) return null;
  return (
    <Command.Group heading="Ask AI" className="cmdk-group">
      <Command.Item
        value={query.trim()}
        forceMount
        className="cmdk-item"
        onSelect={() => announce(runQuery(query, selectedColumnIds()))}
      >
        <Sparkles size={14} className="text-accent" />
        <span className="truncate">
          Run “<span className="text-text-1">{query.trim()}</span>” with AI
        </span>
        <span className="ml-auto shrink-0 rounded-full border border-accent/30 bg-accent-muted px-1.5 py-0.5 text-[10px] font-medium text-accent">
          AI
        </span>
      </Command.Item>
    </Command.Group>
  );
}

function UndoRedoItems() {
  const undo = useSheet((s) => s.undo);
  const redo = useSheet((s) => s.redo);
  const canUndo = useSheet((s) => s.past.length > 0);
  const canRedo = useSheet((s) => s.future.length > 0);
  return (
    <>
      <CmdItem
        value="undo"
        disabled={!canUndo}
        onSelect={() => {
          undo();
          useUi.getState().setCommandBarOpen(false);
        }}
      >
        <Undo2 size={14} /> Undo <Hint k="⌘Z" />
      </CmdItem>
      <CmdItem
        value="redo"
        disabled={!canRedo}
        onSelect={() => {
          redo();
          useUi.getState().setCommandBarOpen(false);
        }}
      >
        <Redo2 size={14} /> Redo <Hint k="⌘⇧Z" />
      </CmdItem>
    </>
  );
}

function Hint({ k }: { k: string }) {
  return (
    <span className="ml-auto shrink-0">
      <Kbd>{k}</Kbd>
    </span>
  );
}

function CmdItem(props: {
  value: string;
  onSelect: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={props.value}
      onSelect={props.onSelect}
      disabled={props.disabled}
      className="cmdk-item"
    >
      {props.children}
    </Command.Item>
  );
}

function announce(outcome: ReturnType<typeof runQuery>) {
  if (outcome.kind === "noop") {
    toast.warning(outcome.message ?? "Nothing to do.");
    return;
  }
  if (outcome.kind === "analysis" && outcome.analysis) {
    const lines = outcome.analysis.lines;
    toast.message(outcome.analysis.label, {
      description:
        lines.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-[11.5px] text-text-2">
            {lines.slice(0, 8).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
            {lines.length > 8 && <li>… and {lines.length - 8} more</li>}
          </ul>
        ) : undefined,
      duration: 8000,
    });
    return;
  }
  toast.success(outcome.message ?? "Running…");
}

function describeScope(sel: ReturnType<typeof useUi.getState>["selection"]): string {
  switch (sel.kind) {
    case "cell":
      return `${a1(sel.col)}${sel.row + 1}`;
    case "range":
      return `${a1(sel.rect.c0)}${sel.rect.r0 + 1}:${a1(sel.rect.c1)}${
        sel.rect.r1 + 1
      } · ${(sel.rect.c1 - sel.rect.c0 + 1) * (sel.rect.r1 - sel.rect.r0 + 1)} cells`;
    case "cols":
      return sel.from === sel.to
        ? `column ${a1(sel.from)}`
        : `columns ${a1(sel.from)}–${a1(sel.to)}`;
    case "rows":
      return sel.from === sel.to
        ? `row ${sel.from + 1}`
        : `rows ${sel.from + 1}–${sel.to + 1}`;
    default:
      return "entire dataset";
  }
}

const a1 = (i: number): string => {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};
