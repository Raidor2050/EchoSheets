import { create } from "zustand";
import { useSheet } from "../../lib/dataset/store";
import { uid } from "../../lib/id";
import type { AiOperationRecord, AiPlan, OutputMode, StagedCell } from "../../types";

export interface StagingState {
  active: boolean;
  opId: string;
  title: string;
  instruction: string;
  strategy: "deterministic" | "llm";
  model: string | null;
  output: OutputMode;
  targetColIds: string[];
  /** rowIndex -> staged cell (only rows with a result). */
  cells: Map<number, StagedCell>;
  totalRows: number;
  running: boolean;
  cancelled: boolean;
  /** The plan being previewed — kept for targeted retries. */
  plan: AiPlan | null;

  begin: (args: {
    title: string;
    instruction: string;
    strategy: "deterministic" | "llm";
    model: string | null;
    output: OutputMode;
    targetColIds: string[];
    totalRows: number;
    plan: AiPlan | null;
  }) => void;
  setCell: (row: number, cell: StagedCell) => void;
  setRunning: (running: boolean) => void;
  cancel: () => void;
  toggleExcluded: (row: number) => void;
  discard: () => void;
  /** Commit staged (non-excluded, ok) cells into the sheet + history + ledger. */
  commit: () => AiOperationRecord | null;
}

export const useStaging = create<StagingState>((set, get) => ({
  active: false,
  opId: "",
  title: "",
  instruction: "",
  strategy: "deterministic",
  model: null,
  output: { mode: "replace" },
  targetColIds: [],
  cells: new Map(),
  totalRows: 0,
  running: false,
  cancelled: false,
  plan: null,

  begin: (args) =>
    set({
      active: true,
      opId: uid("aio"),
      title: args.title,
      instruction: args.instruction,
      strategy: args.strategy,
      model: args.model,
      output: args.output,
      targetColIds: args.targetColIds,
      cells: new Map(),
      totalRows: args.totalRows,
      running: true,
      cancelled: false,
      plan: args.plan,
    }),

  setCell: (row, cell) =>
    set((s) => {
      const next = new Map(s.cells);
      next.set(row, cell);
      return { cells: next };
    }),

  setRunning: (running) => set({ running }),
  cancel: () => set({ cancelled: true, running: false }),
  toggleExcluded: (row) =>
    set((s) => {
      const cur = s.cells.get(row);
      if (!cur) return s;
      if (cur.status !== "ok") return s;
      const next = new Map(s.cells);
      next.set(row, { ...cur, excluded: !cur.excluded });
      return { cells: next };
    }),

  discard: () =>
    set({
      active: false,
      opId: "",
      cells: new Map(),
      running: false,
      cancelled: false,
      plan: null,
    }),

  commit: () => {
    const st = get();
    if (!st.active) return null;
    const sheet = useSheet.getState();

    let colId: string | null = null;
    const out = st.output;
    if (out.mode === "new-column") {
      const existing = sheet.columns.find(
        (c) => c.name.toLowerCase() === out.name.toLowerCase(),
      );
      colId = existing?.id ?? sheet.insertColumn(out.name).id;
    }

    const finalPatches: Array<{ colId: string; row: number; to: string }> = [];
    for (const [row, cell] of st.cells) {
      if (cell.status !== "ok" || cell.excluded) continue;
      finalPatches.push({ colId: colId ?? st.targetColIds[0] ?? "", row, to: cell.value });
    }

    if (finalPatches.length > 0) {
      sheet.applyPatches(finalPatches, `AI · ${st.title}`, "ai");
    }

    const okCount = finalPatches.length;
    const failCount = [...st.cells.values()].filter((c) => c.status === "error").length;

    const record: AiOperationRecord = {
      id: st.opId,
      at: Date.now(),
      title: st.title,
      instruction: st.instruction,
      scopeLabel: st.targetColIds.length
        ? `${st.targetColIds.length} column${st.targetColIds.length === 1 ? "" : "s"}`
        : `${st.totalRows} rows`,
      strategy: st.strategy,
      model: st.model,
      inputColumns: [],
      outputColumn: out.mode === "new-column" ? out.name : null,
      affectedCells: st.totalRows,
      okCells: okCount,
      failedCells: failCount,
      durationMs: 0,
    };

    st.discard();
    return record;
  },
}));
