import { describe, expect, it } from "vitest";
import { parseCsvText, stripBom } from "../src/lib/dataset/csvParse";

describe("stripBom", () => {
  it("strips UTF-8 BOM", () => {
    expect(stripBom("\uFEFFa,b")).toBe("a,b");
  });

  it("leaves plain text alone", () => {
    expect(stripBom("a,b")).toBe("a,b");
  });
});

describe("parseCsvText", () => {
  it("parses basic comma CSV with CRLF", () => {
    const r = parseCsvText("name,age\r\nada,36\r\nbob,null\r\n".replace("null", "24"));
    expect(r.headers).toEqual(["name", "age"]);
    expect(r.rowCount).toBe(2);
    expect(r.columns[0]).toEqual(["ada", "bob"]);
    expect(r.columns[1]).toEqual(["36", "24"]);
  });

  it("handles LF-only row endings", () => {
    const r = parseCsvText("a,b\n1,2\n3,4");
    expect(r.columns).toEqual([
      ["1", "3"],
      ["2", "4"],
    ]);
  });

  it("auto-detects semicolon delimiters", () => {
    const r = parseCsvText("a;b\n1;2");
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.columns[1]).toEqual(["2"]);
  });

  it("auto-detects tab delimiters", () => {
    const r = parseCsvText("a\tb\n1\t2");
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.columns[0]).toEqual(["1"]);
  });

  it("respects quoted fields with commas, quotes and newlines", () => {
    const r = parseCsvText('v,w\n"say ""hi""",x\n"a,b","line\nbreak"');
    expect(r.columns[0]).toEqual(['say "hi"', "a,b"]);
    expect(r.columns[1]).toEqual(["x", "line\nbreak"]);
  });

  it("maps blank cells to null", () => {
    const r = parseCsvText("a,b,c\n1,,3\n, ,");
    expect(r.columns[0]).toEqual(["1", null]);
    // A single space is content, not blank.
    expect(r.columns[1]).toEqual([null, " "]);
    expect(r.columns[2]).toEqual(["3", null]);
  });

  it("folds surplus cells into the last column (uDSV ragged semantics)", () => {
    const r = parseCsvText("a,b,c\n1,2,3\n4,5,6,7");
    expect(r.rowCount).toBe(2);
    expect(r.columns[0]).toEqual(["1", "4"]);
    expect(r.columns[1]).toEqual(["2", "5"]);
    // No data loss: extra fields stay readable inside the final column.
    expect(r.columns[2]).toEqual(["3", "6,7"]);
  });

  it("merges a short row into the next line (uDSV strict-RFC behavior)", () => {
    const r = parseCsvText("a,b,c\n1\n1,2,3");
    expect(r.rowCount).toBe(1);
    expect(r.columns[0]).toEqual(["1\n1"]);
    expect(r.columns[1]).toEqual(["2"]);
    expect(r.columns[2]).toEqual(["3"]);
  });

  it("rejects empty input with a friendly message", () => {
    expect(() => parseCsvText("")).toThrow(/empty/);
    expect(() => parseCsvText("   \n\t")).toThrow(/empty/);
  });

  it("accepts a header-only file as zero rows", () => {
    const r = parseCsvText("a,b\r\n");
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.rowCount).toBe(0);
    expect(r.columns).toEqual([]);
  });

  it("keeps duplicate header names verbatim", () => {
    const r = parseCsvText("id,id\n1,2");
    expect(r.headers).toEqual(["id", "id"]);
    expect(r.columns[1]).toEqual(["2"]);
  });

  it("names blank headers by position", () => {
    const r = parseCsvText("a,\n1,2");
    expect(r.headers).toEqual(["a", "Column 2"]);
  });

  it("reports progress while parsing large inputs", () => {
    const seen: number[] = [];
    const rows = Array.from({ length: 60000 }, (_, i) => `${i},x`).join("\n");
    parseCsvText(`a,b\n${rows}`, { progressEvery: 25000, onProgress: (n) => seen.push(n) });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toBeLessThanOrEqual(25001);
  });

  it("stays fast on 200k rows x 5 cols", () => {
    const line = "12,hello world,2024-01-05,true,3.14";
    const text = `n,s,d,f,m\n${Array.from({ length: 200_000 }, () => line).join("\n")}`;
    const t0 = performance.now();
    const r = parseCsvText(text);
    const ms = performance.now() - t0;
    expect(r.rowCount).toBe(200_000);
    expect(r.columns[4]?.[199_999]).toBe("3.14");
    expect(ms).toBeLessThan(5000);
  });
});
