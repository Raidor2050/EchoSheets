import { Layers, PencilLine, Sparkles, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";

const kindMeta: Record<string, { icon: React.ReactNode; tint: string }> = {
  ai: { icon: <Sparkles size={12} className="text-accent" />, tint: "text-accent" },
  edit: { icon: <PencilLine size={12} className="text-text-2" />, tint: "" },
  structural: {
    icon: <Layers size={12} className="text-warning-fg" />,
    tint: "text-warning-fg",
  },
};

export function HistoryPanel() {
  const open = useUi((s) => s.historyOpen);
  const setOpen = useUi((s) => s.setHistoryOpen);
  const past = useSheet((s) => s.past);
  const future = useSheet((s) => s.future);
  const reduceMotion = useReducedMotion();

  const entries = [...past].reverse();
  const nextRedo = future[future.length - 1];

  return (
    <AnimatePresence>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          />
          <motion.aside
            initial={reduceMotion ? false : { x: 340 }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: 340 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-11 bottom-7 z-40 flex w-[320px] flex-col border-l border-line bg-surface-1"
            aria-label="Operation history"
          >
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-line-subtle px-3">
              <span className="text-[12.5px] font-medium">History</span>
              <button
                type="button"
                className="cursor-pointer rounded-sm p-1 text-text-3 hover:bg-surface-3 hover:text-text-1"
                aria-label="Close history"
                onClick={() => setOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {entries.length === 0 && (
                <p className="px-2 py-6 text-center text-[12px] text-text-3">
                  No operations yet. Edits and AI changes will appear here.
                </p>
              )}
              {entries.map((e, idx) => {
                const meta = kindMeta[e.kind] ?? kindMeta.edit!;
                return (
                  <div
                    key={e.id}
                    className={`flex items-start gap-2 rounded-sm px-2 py-2 text-[12px] ${
                      idx === 0 ? "bg-surface-2" : ""
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{e.label}</div>
                      <div className="num mt-0.5 text-[10.5px] text-text-3">
                        {e.patches.length} cells ·{" "}
                        {new Date(e.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                        {idx === 0 && <span className="ml-1.5 text-accent">latest</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-line-subtle px-3 py-2 text-[11px] text-text-3">
              {nextRedo ? (
                <span className="flex items-center gap-1.5">
                  <Trash2 size={11} /> Next redo:{" "}
                  <span className="truncate text-text-2">{nextRedo.label}</span>
                </span>
              ) : (
                "Nothing to redo"
              )}
              <div className="mt-0.5">⌘Z undo · ⌘⇧Z redo</div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
