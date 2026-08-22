import DataEditor, {
  type GridCell,
  GridCellKind,
  type GridColumn,
  type GridSelection,
  type Item,
} from "@glideapps/glide-data-grid";
import { useCallback, useMemo } from "react";
import { useSheet } from "../../lib/dataset/store";
import { useUi } from "../../lib/uiStore";
import type { SelectionScope } from "../../types";
import { useStaging } from "../ai/stagingStore";
import {
  columnWidth,
  excludedStagedThemeOverride,
  failedThemeOverride,
  makeGridTheme,
  pendingThemeOverride,
  stagedThemeOverride,
} from "./gridTheme";

const textCell = (data: string, themeOverride?: GridCell["themeOverride"]): GridCell => ({
  kind: GridCellKind.Text,
  data,
  displayData: data,
  allowOverlay: true,
  themeOverride,
});

export function DataGrid() {
  const columns = useSheet((s) => s.columns);
  const meta = useSheet((s) => s.meta);
  const editCell = useSheet((s) => s.editCell);
  const clearCells = useSheet((s) => s.clearCells);
  const setSelection = useUi((s) => s.setSelection);
  const toggleExcluded = useStaging((s) => s.toggleExcluded);

  const stagingActive = useStaging((s) => s.active);
  const stagingOutput = useStaging((s) => s.output);
  const stagingTargetIds = useStaging((s) => s.targetColIds);
  const stagedCells = useStaging((s) => s.cells);

  const theme = useMemo(() => makeGridTheme(), []);

  /** Ghost output column appended during new-column previews. */
  const ghostTitle =
    stagingActive && stagingOutput.mode === "new-column" ? `✦ ${stagingOutput.name}` : null;

  const gridColumns: GridColumn[] = useMemo(() => {
    const base: GridColumn[] = columns.map((c) => ({
      title: c.name,
      id: c.id,
      width: columnWidth(c),
    }));
    if (ghostTitle) base.push({ title: ghostTitle, width: 220 });
    return base;
  }, [columns, ghostTitle]);

  const rowCount = columns[0]?.values.length ?? 0;
  const totalCols = gridColumns.length;

  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [colIdx, row] = cell;
      const col = columns[colIdx];

      // Ghost column during new-column preview:
      if (ghostTitle && !col && colIdx === totalCols - 1) {
        const staged = stagedCells.get(row);
        if (!staged || staged.status === "pending")
          return textCell("", pendingThemeOverride);
        if (staged.status === "error") return textCell(staged.value, failedThemeOverride);
        return textCell(
          staged.value,
          staged.excluded ? excludedStagedThemeOverride : stagedThemeOverride,
        );
      }

      if (!col) return textCell("");

      // Replace-mode staging tints the target columns themselves.
      const staged =
        stagingActive &&
        stagingOutput.mode === "replace" &&
        stagingTargetIds.includes(col.id)
          ? stagedCells.get(row)
          : undefined;

      if (!staged) return textCell(col.values[row] ?? "");

      if (staged.status === "pending") return textCell("", pendingThemeOverride);
      if (staged.status === "error")
        return textCell(col.values[row] ?? "", failedThemeOverride);
      return textCell(
        staged.value,
        staged.excluded ? excludedStagedThemeOverride : stagedThemeOverride,
      );
    },
    [
      columns,
      totalCols,
      ghostTitle,
      stagingActive,
      stagingOutput.mode,
      stagingTargetIds,
      stagedCells,
    ],
  );

  const onCellEdited = useCallback(
    (cell: Item, newValue: EditableCell) => {
      const col = columns[cell[0]];
      if (!col) return;
      editCell(col.id, cell[1], String(newValue.data ?? ""));
    },
    [columns, editCell],
  );

  const onGridSelectionChange = useCallback(
    (sel: GridSelection) => setSelection(describeSelection(sel)),
    [setSelection],
  );

  const onCellClicked = useCallback(
    (cell: Item) => {
      if (!stagingActive) return;
      const [, row] = cell;
      if (stagedCells.has(row)) toggleExcluded(row);
    },
    [stagingActive, stagedCells, toggleExcluded],
  );

  const onDelete = useCallback(
    (sel: GridSelection): boolean => {
      const targets: Array<{ colId: string; row: number }> = [];
      const selCols = colsInSelection(sel, columns.length);
      const selRows = rowsInSelection(sel, rowCount);
      for (const colIdx of selCols) {
        const col = columns[colIdx];
        if (!col) continue;
        for (const row of selRows) targets.push({ colId: col.id, row });
      }
      clearCells(targets);
      return true;
    },
    [columns, rowCount, clearCells],
  );

  if (!meta) return null;

  return (
    <DataEditor
      theme={theme}
      columns={gridColumns}
      rows={rowCount}
      getCellContent={getCellContent}
      onCellEdited={onCellEdited}
      onCellClicked={onCellClicked}
      onGridSelectionChange={onGridSelectionChange}
      onDelete={onDelete}
      rowMarkers="none"
      smoothScrollX
      smoothScrollY
      getCellsForSelection={(sel) => {
        const result: GridCell[][] = [];
        for (let r = sel.y; r < sel.y + sel.height; r++) {
          const rowCells: GridCell[] = [];
          for (let c = sel.x; c < sel.x + sel.width; c++)
            rowCells.push(getCellContent([c, r]));
          result.push(rowCells);
        }
        return result;
      }}
      rangeSelect="rect"
      columnSelect="multi"
      rowSelect="multi"
      width="100%"
      height="100%"
    />
  );
}

type EditableCell = Parameters<
  NonNullable<React.ComponentProps<typeof DataEditor>["onCellEdited"]>
>[1];

function describeSelection(sel: GridSelection): SelectionScope {
  const range = sel.current?.range;
  if (range && range.width > 0 && range.height > 0) {
    if (range.width === 1 && range.height === 1)
      return { kind: "cell", col: range.x, row: range.y };
    return {
      kind: "range",
      rect: {
        c0: range.x,
        r0: range.y,
        c1: range.x + range.width - 1,
        r1: range.y + range.height - 1,
      },
    };
  }
  if (sel.columns.length > 0) {
    const arr = sel.columns.toArray();
    return { kind: "cols", from: Math.min(...arr), to: Math.max(...arr) };
  }
  if (sel.rows.length > 0) {
    const arr = sel.rows.toArray();
    return { kind: "rows", from: Math.min(...arr), to: Math.max(...arr) };
  }
  return { kind: "none" };
}

function colsInSelection(sel: GridSelection, max: number): number[] {
  if (sel.columns.length > 0) return sel.columns.toArray();
  const range = sel.current?.range;
  if (range) {
    const out: number[] = [];
    for (let c = range.x; c < range.x + range.width; c++) if (c < max) out.push(c);
    return out;
  }
  return [];
}

function rowsInSelection(sel: GridSelection, max: number): number[] {
  if (sel.rows.length > 0) return sel.rows.toArray();
  const range = sel.current?.range;
  if (range) {
    const out: number[] = [];
    for (let r = range.y; r < range.y + range.height; r++) if (r < max) out.push(r);
    return out;
  }
  return [];
}
