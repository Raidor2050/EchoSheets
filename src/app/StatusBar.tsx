import { loadProviderConfig } from "../features/ai/provider";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";
import { formatNumber } from "../lib/utils";
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

/** Collect numeric values from the current selection for aggregate display. */
function selectedNumbers(sel: SelectionScope): number[] {
  const columns = useSheet.getState().columns;
  const nums: number[] = [];
  const visit = (colIdx: number, row: number) => {
    const v = columns[colIdx]?.values[row];
    if (v != null) {
      const n = Number(v.replace(/,/g, ""));
      if (Number.isFinite(n)) nums.push(n);
    }
  };
  switch (sel.kind) {
    case "cell":
      visit(sel.col, sel.row);
      break;
    case "range":
      for (let c = sel.rect.c0; c <= sel.rect.c1; c++)
        for (let r = sel.rect.r0; r <= sel.rect.r1; r++) visit(c, r);
      break;
    default:
      break;
  }
  return nums;
}

export function StatusBar() {
  const meta = useSheet((s) => s.meta);
  const columns = useSheet((s) => s.columns);
  const selection = useUi((s) => s.selection);

  const rowCount = columns[0]?.values.length ?? 0;
  const nums = selectedNumbers(selection);
  const sum = nums.reduce((a, b) => a + b, 0);
  const avg = nums.length ? sum / nums.length : NaN;

  let selText = "—";
  switch (selection.kind) {
    case "cell":
      selText = `${a1(selection.col)}${selection.row + 1}`;
      break;
    case "range":
      selText = `${a1(selection.rect.c0)}${selection.rect.r0 + 1}:${a1(
        selection.rect.c1,
      )}${selection.rect.r1 + 1}`;
      break;
    case "cols":
      selText = `Col ${a1(selection.from)}${selection.from === selection.to ? "" : `–${a1(selection.to)}`}`;
      break;
    case "rows":
      selText = `Row ${selection.from + 1}${selection.from === selection.to ? "" : `–${selection.to + 1}`}`;
      break;
    default:
      selText = `${formatNumber(rowCount)} × ${columns.length}`;
  }

  const showAggregates = nums.length > 0;

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-line-subtle bg-surface-1 px-3 text-[11px] text-text-3">
      <span className="shrink-0 text-text-2">
        {meta?.name} · {formatNumber(rowCount)} rows · {columns.length} cols
      </span>
      <span className="num truncate">{selText}</span>

      <span className="ml-auto flex shrink-0 items-center gap-4">
        {showAggregates ? (
          <>
            <Agg label="Sum" value={sum} />
            <Agg label="Avg" value={avg} />
            <Agg label="Count" value={nums.length} plain />
          </>
        ) : (
          <ProviderStatus />
        )}
        <span className="num hidden md:inline text-[11px]">100%</span>
      </span>
    </footer>
  );
}

function Agg({ label, value, plain }: { label: string; value: number; plain?: boolean }) {
  const formatted = plain
    ? formatNumber(value)
    : new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
      }).format(value);
  return (
    <span className="flex items-center gap-1.5 text-text-3">
      <span>{label}:</span>
      <span className="num text-text-1">{formatted}</span>
    </span>
  );
}

function ProviderStatus() {
  const cfg = loadProviderConfig();
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${cfg ? "bg-success-fg" : "bg-warning"}`}
      />
      {cfg ? `AI ready · ${cfg.model}` : "AI not connected"}
    </span>
  );
}
