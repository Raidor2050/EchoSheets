import { create } from "zustand";
import { uid } from "../../lib/id";
import type { CellPatch, Column, DatasetMeta, HistoryEntry } from "../../types";
import { inferColumnType } from "./inferTypes";

const MAX_HISTORY = 100;

interface SheetState {
  meta: DatasetMeta | null;
  columns: Column[];

  past: HistoryEntry[];
  future: HistoryEntry[];

  loadDataset: (
    input: { headers: string[]; columns: (string | null)[][] },
    name: string,
    sizeBytes: number | null,
  ) => void;

  closeDataset: () => void;

  /** Direct cell edit — records one history entry. */
  editCell: (colId: string, row: number, value: string) => void;

  /** Clear every selected cell — one history entry. */
  clearCells: (patchesTarget: Array<{ colId: string; row: number }>) => void;

  /** Commit a batch of patches (e.g. an applied AI operation). */
  applyPatches: (
    patches: Omit<CellPatch, "from">[],
    label: string,
    kind: HistoryEntry["kind"],
  ) => void;

  insertColumn: (name: string) => Column;

  undo: () => void;
  redo: () => void;
}

const invert = (patches: Omit<CellPatch, "from">[], columns: Column[]): CellPatch[] =>
  patches.map((p) => {
    const col = columns.find((c) => c.id === p.colId);
    return { ...p, from: col?.values[p.row] ?? null };
  });

export const useSheet = create<SheetState>((set, get) => ({
  meta: null,
  columns: [],
  past: [],
  future: [],

  loadDataset: (input, name, sizeBytes) => {
    const columns: Column[] = input.headers.map((h, i) => {
      const values = input.columns[i] ?? [];
      const profile = inferColumnType(values);
      return {
        id: uid("col"),
        name: h,
        type: profile.type === "empty" && values.length > 0 ? "text" : profile.type,
        values,
      };
    });
    set({
      meta: { id: uid("ds"), name, sizeBytes, importedAt: Date.now() },
      columns,
      past: [],
      future: [],
    });
  },

  closeDataset: () => set({ meta: null, columns: [], past: [], future: [] }),

  editCell: (colId, row, value) => {
    const { columns } = get();
    const col = columns.find((c) => c.id === colId);
    if (!col || col.values[row] === value) return;
    get().applyPatches([{ colId, row, to: value }], "Edit cell", "edit");
  },

  clearCells: (targets) => {
    if (targets.length === 0) return;
    get().applyPatches(
      targets.map((t) => ({ ...t, to: null })),
      `Clear ${targets.length} ${targets.length === 1 ? "cell" : "cells"}`,
      "edit",
    );
  },

  applyPatches: (patches, label, kind) => {
    const { columns, past } = get();
    const inverted = invert(patches, columns);
    const byCol = new Map<string, CellPatch[]>();
    for (const p of inverted) {
      const list = byCol.get(p.colId) ?? [];
      list.push(p);
      byCol.set(p.colId, list);
    }
    let next = columns;
    for (const [colId, colPatches] of byCol) {
      next = next.map((c) => {
        if (c.id !== colId) return c;
        const values = c.values.slice();
        for (const p of colPatches) values[p.row] = p.to;
        return { ...c, values };
      });
    }
    const entry: HistoryEntry = {
      id: uid("op"),
      label,
      kind,
      patches: inverted,
      at: Date.now(),
    };
    set({
      columns: next,
      past: [...past.slice(-MAX_HISTORY + 1), entry],
      future: [],
    });
  },

  insertColumn: (name) => {
    const { columns } = get();
    const rowCount = columns[0]?.values.length ?? 0;
    const col: Column = {
      id: uid("col"),
      name,
      type: "text",
      values: new Array<string | null>(rowCount).fill(null),
    };
    set({ columns: [...columns, col] });
    return col;
  },

  undo: () => {
    const { past, future, columns } = get();
    const entry = past[past.length - 1];
    if (!entry) return;
    // Apply inverse of each patch (to -> from).
    const byCol = new Map<string, CellPatch[]>();
    for (const p of entry.patches) {
      const list = byCol.get(p.colId) ?? [];
      list.push({ colId: p.colId, row: p.row, from: p.to, to: p.from });
      byCol.set(p.colId, list);
    }
    let next = columns;
    for (const [colId, colPatches] of byCol) {
      next = next.map((c) => {
        if (c.id !== colId) return c;
        const values = c.values.slice();
        for (const p of colPatches) values[p.row] = p.to;
        return { ...c, values };
      });
    }
    set({
      columns: next,
      past: past.slice(0, -1),
      future: [...future, entry],
    });
  },

  redo: () => {
    const { past, future, columns } = get();
    const entry = future[future.length - 1];
    if (!entry) return;
    const byCol = new Map<string, CellPatch[]>();
    for (const p of entry.patches) {
      const list = byCol.get(p.colId) ?? [];
      list.push({ colId: p.colId, row: p.row, from: p.from, to: p.to });
      byCol.set(p.colId, list);
    }
    let next = columns;
    for (const [colId, colPatches] of byCol) {
      next = next.map((c) => {
        if (c.id !== colId) return c;
        const values = c.values.slice();
        for (const p of colPatches) values[p.row] = p.to;
        return { ...c, values };
      });
    }
    set({
      columns: next,
      past: [...past, entry],
      future: future.slice(0, -1),
    });
  },
}));
