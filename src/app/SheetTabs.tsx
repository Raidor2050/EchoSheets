import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useSheet } from "../lib/dataset/store";

/**
 * Sheets-style tab strip. EchoSheets is currently single-dataset, so this
 * renders the active sheet plus a "+" affordance that communicates the
 * (roadmap) multi-sheet behavior without faking data.
 */
export function SheetTabs() {
  const meta = useSheet((s) => s.meta);
  const name = meta?.name ?? "Sheet1";

  return (
    <div className="flex h-8 shrink-0 items-center gap-1 border-t border-line-subtle bg-surface-1 px-2">
      <button
        type="button"
        aria-label="All sheets"
        title="All sheets"
        className="flex h-7 w-7 items-center justify-center rounded-sm text-text-3 hover:bg-surface-3 hover:text-text-1"
      >
        <span className="flex flex-col gap-[3px]" aria-hidden>
          <span className="block h-px w-3.5 bg-current" />
          <span className="block h-px w-3.5 bg-current" />
          <span className="block h-px w-3.5 bg-current" />
        </span>
      </button>

      <div className="flex items-stretch">
        <div className="relative flex h-7 items-center rounded-t-sm border border-line bg-surface-2 px-3 text-[12px] text-text-1">
          <span
            className="absolute inset-x-0 top-0 h-0.5 rounded-t-sm bg-accent"
            aria-hidden
          />
          <span className="max-w-44 truncate">{name}</span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Add sheet"
        title="Multi-sheet support is next (roadmap)"
        className="flex h-7 w-7 items-center justify-center rounded-sm text-text-3 hover:bg-surface-3 hover:text-text-1"
        onClick={() =>
          toast.message("Multi-sheet is on the roadmap", {
            description: "EchoSheets currently works on one dataset at a time.",
          })
        }
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
