import { describe, expect, it } from "vitest";
import { inferColumnType, typeLabel } from "../src/lib/dataset/inferTypes";
import { sanitizeFormulaInjection, serializeCsv } from "../src/lib/dataset/serializeCsv";
import type { Column } from "../src/types";

const col = (name: string, values: (string | null)[]): Column => ({
  id: name,
  name,
  type: "text",
  values,
});

describe("serializeCsv", () => {
  it("round-trips basic rows", () => {
    const cols = [col("a", ["1", "2"]), col("b", ["x", "y"])];
    const out = serializeCsv(cols);
    expect(out).toBe("a,b\r\n1,x\r\n2,y");
  });

  it("quotes fields containing commas, quotes and newlines", () => {
    const cols = [col("v", ['say "hi"', "a,b", "line\nbreak"])];
    const out = serializeCsv(cols);
    expect(out).toContain('"say ""hi"""');
    expect(out).toContain('"a,b"');
    expect(out).toContain('"line\nbreak"');
  });

  it("emits empty string for null cells", () => {
    const cols = [col("v", [null])];
    expect(serializeCsv(cols)).toBe("v\r\n");
  });

  it("sanitizes formula injection by default", () => {
    const cols = [col("v", ["=cmd|'/c calc'!A1", "+1", "-5", "@sum", "ok"])];
    const out = serializeCsv(cols);
    expect(out).toContain("'=cmd");
    expect(out).toContain("'+1");
    expect(out).toContain("'-5");
    expect(out).toContain("'@sum");
    expect(out.split("\r\n")[1]).toBe("'=cmd|'/c calc'!A1".replace("'", "'"));
  });

  it("can disable sanitization", () => {
    const cols = [col("v", ["=1"])];
    expect(serializeCsv(cols, { sanitize: false })).toBe("v\r\n=1");
  });
});

describe("sanitizeFormulaInjection", () => {
  it.each([
    ["=A1", "'=A1"],
    ["+42", "'+42"],
    ["-7", "'-7"],
    ["@x", "'@x"],
    ["\t9", "'\t9"],
    ["plain", "plain"],
    ["negative stays - inside", "negative stays - inside"],
  ])("%s → %s", (input, expected) => {
    expect(sanitizeFormulaInjection(input)).toBe(expected);
  });
});

describe("inferColumnType", () => {
  it("detects numbers", () => {
    expect(inferColumnType(["1", "2.5", "+3", "1,234"]).type).toBe("number");
    expect(inferColumnType(["50%", "25%"]).type).toBe("number");
  });

  it("detects ISO and US dates", () => {
    expect(inferColumnType(["2024-01-01", "2024-02-03T10:00:00Z"]).type).toBe("date");
    expect(inferColumnType(["1/5/2024", "12/30/1999"]).type).toBe("date");
  });

  it("detects booleans", () => {
    expect(inferColumnType(["true", "false", "yes"]).type).toBe("boolean");
  });

  it("falls back to text", () => {
    expect(inferColumnType(["hello@world.com", "not a num"]).type).toBe("text");
  });

  it("detects empty columns", () => {
    const p = inferColumnType([null, "", null]);
    expect(p.type).toBe("empty");
    expect(typeLabel(p.type)).toBe("Empty");
  });

  it("reports blanks and unique counts", () => {
    const p = inferColumnType(["a", "b", "b", null]);
    expect(p.blanks).toBe(1);
    expect(p.unique).toBe(2);
  });
});
