import { loadProviderConfig } from "../features/ai/provider";
import { useSheet } from "../lib/dataset/store";
import { useUi } from "../lib/uiStore";
import { formatBytes, formatNumber } from "../lib/utils";

const a1 = (i: number): string => {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};

export function StatusBar() {
  const meta = useSheet((s) => s.meta);
  const columns = useSheet((s) => s.columns);
  const selection = useUi((s) => s.selection);

  if (!meta) return null;
  const rowCount = columns[0]?.values.length ?? 0;

  let selText = "—";
  switch (selection.kind) {
    case "cell":
      selText = `${a1(selection.col)}${selection.row + 1}`;
      break;
    case "range":
      selText = `${a1(selection.rect.c0)}${selection.rect.r0 + 1}:${a1(
        selection.rect.c1,
      )}${selection.rect.r1 + 1} · ${
        (selection.rect.c1 - selection.rect.c0 + 1) *
        (selection.rect.r1 - selection.rect.r0 + 1)
      } cells`;
      break;
    case "cols":
      selText =
        selection.from === selection.to
          ? `Column ${a1(selection.from)}`
          : `Columns ${a1(selection.from)}–${a1(selection.to)}`;
      break;
    case "rows":
      selText =
        selection.from === selection.to
          ? `Row ${selection.from + 1}`
          : `Rows ${selection.from + 1}–${selection.to + 1}`;
      break;
    default:
      selText = `${formatNumber(rowCount)} × ${columns.length}`;
  }

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line-subtle bg-surface-1 px-3 text-[11px] text-text-3">
      <span className="num shrink-0">
        {meta.name} · {formatNumber(rowCount)} rows · {columns.length} cols
        {meta.sizeBytes != null ? ` · ${formatBytes(meta.sizeBytes)}` : ""}
      </span>
      <span className="num truncate text-text-2">{selText}</span>
      <span className="ml-auto flex shrink-0 items-center gap-3">
        <ProviderStatus />
        <span className="hidden md:inline">⌘K ask AI · ⌘Z undo · Del clear</span>
      </span>
    </footer>
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
