import { beforeEach, describe, expect, it } from "vitest";
import { useStaging } from "../src/features/ai/stagingStore";
import { useSheet } from "../src/lib/dataset/store";

function loadTiny() {
  useSheet.getState().loadDataset(
    {
      headers: ["Name", "Email"],
      columns: [
        ["  ada  ", "GRACE", "linus"],
        ["ada@acme.com", "grace@google.com", "linus@ibm.com"],
      ],
    },
    "tiny.csv",
    100,
  );
}

describe("sheet store history", () => {
  beforeEach(() => loadTiny());

  it("editCell records an undoable patch", () => {
    const s = useSheet.getState();
    s.editCell(s.columns[0]!.id, 0, "ada");
    expect(useSheet.getState().columns[0]!.values[0]).toBe("ada");
    expect(useSheet.getState().past).toHaveLength(1);

    useSheet.getState().undo();
    expect(useSheet.getState().columns[0]!.values[0]).toBe("  ada  ");
    expect(useSheet.getState().future).toHaveLength(1);

    useSheet.getState().redo();
    expect(useSheet.getState().columns[0]!.values[0]).toBe("ada");
  });

  it("applyPatches batches multiple columns atomically", () => {
    const s = useSheet.getState();
    const c1 = s.columns[0]!;
    const c2 = s.columns[1]!;
    s.applyPatches(
      [
        { colId: c1.id, row: 2, to: "LINUS" },
        { colId: c2.id, row: 2, to: "linus@kernel.org" },
      ],
      "AI test op",
      "ai",
    );
    const st = useSheet.getState();
    expect(st.columns[0]!.values[2]).toBe("LINUS");
    expect(st.columns[1]!.values[2]).toBe("linus@kernel.org");
    expect(st.past.at(-1)!.patches).toHaveLength(2);

    st.undo();
    expect(useSheet.getState().columns[0]!.values[2]).toBe("linus");
    expect(useSheet.getState().columns[1]!.values[2]).toBe("linus@ibm.com");
  });

  it("clearCells nulls targets", () => {
    const s = useSheet.getState();
    s.clearCells([{ colId: s.columns[1]!.id, row: 0 }]);
    expect(useSheet.getState().columns[1]!.values[0]).toBeNull();
  });

  it("new edits drop the redo stack", () => {
    const s = useSheet.getState();
    s.editCell(s.columns[0]!.id, 0, "a");
    s.undo();
    expect(useSheet.getState().future.length).toBe(1);
    useSheet.getState().editCell(useSheet.getState().columns[0]!.id, 1, "b");
    expect(useSheet.getState().future).toHaveLength(0);
  });
});

describe("staging commit", () => {
  beforeEach(() => loadTiny());

  it("commits ok cells into a new column and records history", () => {
    const sheet = useSheet.getState();
    const staging = useStaging.getState();
    const colCountBefore = sheet.columns.length;

    staging.begin({
      title: "Extract domain",
      instruction: "extract domain",
      strategy: "deterministic",
      model: null,
      output: { mode: "new-column", name: "Domain" },
      targetColIds: [],
      totalRows: 3,
      plan: null,
    });
    const st = useStaging.getState();
    st.setCell(0, { value: "acme.com", status: "ok" });
    st.setCell(1, { value: "google.com", status: "ok", excluded: true });
    st.setCell(2, { value: "", status: "error", error: "no domain" });

    const record = st.commit();
    expect(record).not.toBeNull();
    expect(record!.okCells).toBe(1);
    expect(record!.failedCells).toBe(1);

    const after = useSheet.getState();
    expect(after.columns.length).toBe(colCountBefore + 1);
    const newCol = after.columns.at(-1)!;
    expect(newCol.name).toBe("Domain");
    expect(newCol.values).toEqual(["acme.com", null, null]);
    expect(after.past.at(-1)!.label).toBe("AI · Extract domain");
  });

  it("replace mode writes into target columns and is undoable", () => {
    const sheet = useSheet.getState();
    const targetId = sheet.columns[1]!.id;
    const staging = useStaging.getState();
    staging.begin({
      title: "Trim",
      instruction: "trim",
      strategy: "deterministic",
      model: null,
      output: { mode: "replace" },
      targetColIds: [targetId],
      totalRows: 3,
      plan: null,
    });
    useStaging.getState().setCell(0, { value: "clean@acme.com", status: "ok" });
    const record = useStaging.getState().commit();
    expect(record!.okCells).toBe(1);
    expect(useSheet.getState().columns[1]!.values[0]).toBe("clean@acme.com");

    useSheet.getState().undo();
    expect(useSheet.getState().columns[1]!.values[0]).toBe("ada@acme.com");
  });
});
