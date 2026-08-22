import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { formatNumber } from "../../lib/utils";
import { cancelRunningOp, retryFailed } from "./executor";
import { useStaging } from "./stagingStore";

export function PreviewBar() {
  const st = useStaging();
  const reduceMotion = useReducedMotion();

  const visible = st.active;
  let ok = 0;
  let failed = 0;
  let excluded = 0;
  for (const c of st.cells.values()) {
    if (c.status === "ok") {
      if (c.excluded) excluded++;
      else ok++;
    } else if (c.status === "error") failed++;
  }
  const pending = Math.max(st.totalRows - st.cells.size, 0);
  const done = st.totalRows - pending;
  const pct = st.totalRows > 0 ? Math.round((done / st.totalRows) * 100) : 0;

  const onApply = () => {
    const record = st.commit();
    if (record)
      toast.success(
        `Applied ${formatNumber(record.okCells)} ${record.okCells === 1 ? "change" : "changes"} — undo with ⌘Z.`,
      );
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduceMotion ? false : { y: 44, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { y: 44, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto flex h-12 shrink-0 items-center gap-3 border-t border-accent/25 bg-surface-2 px-3"
        >
          <span className="flex h-5 shrink-0 items-center rounded-full border border-accent/30 bg-accent-muted px-1.5 text-[10px] font-semibold tracking-wide text-accent">
            AI PREVIEW
          </span>

          <span className="max-w-64 truncate text-[12.5px] font-medium">{st.title}</span>

          {st.running ? (
            <span className="flex shrink-0 items-center gap-2 text-[11.5px] text-text-2">
              <Loader2 size={13} className="animate-spin text-accent" />
              <span className="num">{pct}%</span>
              <span className="relative h-1 w-24 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-200"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <button
                type="button"
                className="cursor-pointer text-danger-fg hover:underline"
                onClick={cancelRunningOp}
              >
                Cancel
              </button>
            </span>
          ) : (
            <span className="num flex shrink-0 items-center gap-2.5 text-[11.5px]">
              {ok > 0 && (
                <span className="text-success-fg">{formatNumber(ok)} changes</span>
              )}
              {excluded > 0 && (
                <span className="text-warning-fg">{formatNumber(excluded)} excluded</span>
              )}
              {failed > 0 && (
                <span className="text-danger-fg">{formatNumber(failed)} failed</span>
              )}
            </span>
          )}

          {!st.running && (
            <span className="hidden shrink-0 text-[11px] text-text-3 lg:inline">
              Click a previewed cell to exclude it
            </span>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {!st.running && failed > 0 && (
              <button
                type="button"
                className="flex h-7 cursor-pointer items-center gap-1 rounded-sm border border-line px-2.5 text-[12px] text-text-2 transition-colors hover:border-warning/50 hover:text-warning-fg"
                onClick={() => void retryFailed()}
              >
                <RotateCcw size={12} /> Retry failed
              </button>
            )}
            <button
              type="button"
              className="flex h-7 cursor-pointer items-center gap-1 rounded-sm px-2.5 text-[12px] text-text-2 transition-colors hover:bg-surface-3 hover:text-text-1"
              onClick={st.discard}
            >
              <X size={13} /> Discard
            </button>
            <button
              type="button"
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-sm bg-success px-3 text-[12px] font-medium text-black transition-colors hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none"
              onClick={onApply}
              disabled={st.running || (ok === 0 && !st.running)}
            >
              <Check size={13} /> Apply{ok > 0 ? ` ${formatNumber(ok)}` : ""}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
