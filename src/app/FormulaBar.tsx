import { useState } from "react";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";
import type { SelectionScope } from "../types";

const a1 = (i: number): string => {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};

function activeCellRef(sel: SelectionScope): string | null {
  switch (sel.kind) {
    case "cell":
      return `${a1(sel.col)}${sel.row + 1}`;
    case "range":
      return `${a1(sel.rect.c0)}${sel.rect.r0 + 1}:${a1(sel.rect.c1)}${sel.rect.r1 + 1}`;
    default:
      return null;
  }
}

function activeCellValue(sel: SelectionScope): string {
  const columns = useSheet.getState().columns;
  if (sel.kind === "cell") {
    return columns[sel.col]?.values[sel.row] ?? "";
  }
  if (sel.kind === "range") {
    const c = columns[sel.rect.c0];
    if (c) return c.values[sel.rect.r0] ?? "";
  }
  return "";
}

export function FormulaBar() {
  const selection = useUi((s) => s.selection);
  const [draft, setDraft] = useState<string | null>(null);
  const ref = activeCellRef(selection);
  const value = draft ?? activeCellValue(selection);

  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-line-subtle bg-surface-1 px-2">
      <div className="flex h-[26px] w-[74px] shrink-0 items-center border border-line bg-surface-2 px-2 text-[12px] text-text-2">
        <span className="num truncate">{ref ?? "—"}</span>
      </div>
      <button
        type="button"
        aria-label="Insert function"
        className="flex h-[26px] w-7 shrink-0 items-center justify-center text-[13px] italic text-text-3 transition-colors hover:text-accent"
        title="Start a formula (fx)"
      >
        fx
      </button>
      <input
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setDraft(activeCellValue(selection))}
        onBlur={() => setDraft(null)}
        spellCheck={false}
        aria-label="Cell content"
        className="h-[26px] min-w-0 flex-1 rounded-sm border border-line bg-surface-2 px-2 font-mono text-[12.5px] text-text-1 outline-none transition-colors focus:border-accent/60"
        placeholder="Select a cell to edit its value here"
      />
    </div>
  );
}
