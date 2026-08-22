import { describe, expect, it } from "vitest";
import { parseIntent, runAnalysis } from "../src/features/ai/intent";
import {
  extractDomain,
  normalizeWhitespace,
  roundNumber,
  stripCurrency,
  titleCase,
} from "../src/features/ai/ops/deterministic";
import type { Column, DatasetMeta } from "../src/types";

type ColSpec = [name: string, values: string[], type: Column["type"]];

const META: DatasetMeta = {
  id: "ds",
  name: "t.csv",
  sizeBytes: 1,
  importedAt: 0,
};

function makeCtx(cols: ColSpec[]) {
  const columns = cols.map((spec) => ({
    id: `c_${spec[0]}`,
    name: spec[0],
    type: spec[2],
    values: spec[1] as (string | null)[],
  }));
  return { meta: META, columns };
}

describe("deterministic transforms", () => {
  it("extractDomain handles emails and urls", () => {
    expect(extractDomain("john@acme.com")).toBe("acme.com");
    expect(extractDomain("Jane <jane@google.co.uk>")).toBe("google.co.uk");
    expect(extractDomain("https://docs.python.org/guide")).toBe("docs.python.org");
    expect(extractDomain("no domain here")).toBeNull();
  });

  it("normalizeWhitespace collapses runs", () => {
    expect(normalizeWhitespace("  a \t b\n\nc ")).toBe("a b c");
  });

  it("titleCase respects separators", () => {
    expect(titleCase("head of growth")).toBe("Head Of Growth");
    expect(titleCase("VP SALES")).toBe("Vp Sales");
    expect(titleCase("o'neill-smith")).toBe("O'Neill-Smith");
  });

  it("roundNumber parses formatted numbers", () => {
    expect(roundNumber("1234.5678", 2)).toBe("1234.57");
    expect(roundNumber("1,234", 0)).toBe("1234");
    expect(roundNumber("abc", 0)).toBeNull();
  });

  it("stripCurrency pulls the numeric core", () => {
    expect(stripCurrency("$1,234.50")).toBe("1234.5");
    expect(stripCurrency("€99")).toBe("99");
    expect(stripCurrency("n/a")).toBeNull();
  });
});

describe("intent parser — deterministic fast paths", () => {
  it("maps extract-domain to email-like columns only", () => {
    const c = makeCtx([
      ["Name", ["ada"], "text"],
      ["Email", ["ada@acme.com"], "text"],
    ]);
    const plan = parseIntent("extract company domain from emails", c);
    expect(plan?.id).toBe("extract-domain");
    expect(plan?.strategy).toBe("deterministic");
    expect(plan?.targetColIds).toEqual(["c_Email"]);
    expect(plan?.output.mode).toBe("replace");
  });

  it("maps whitespace normalization to all columns", () => {
    const c = makeCtx([["A", [" x  y "], "text"]]);
    const plan = parseIntent("normalize whitespace in all cells", c);
    expect(plan?.targetColIds).toEqual(["c_A"]);
    const fn = plan?.fn;
    expect(fn ? fn(" x  y ", {}) : null).toBe("x y");
  });

  it("maps title case", () => {
    const plan = parseIntent("title case every column", makeCtx([]));
    expect(plan?.id).toBe("title-case");
  });

  it("targets numeric columns for rounding", () => {
    const c = makeCtx([
      ["Name", ["ada"], "text"],
      ["Revenue", ["10.25", "$3.5"], "number"],
    ]);
    const plan = parseIntent("round numbers to whole values", c);
    expect(plan?.targetColIds).toEqual(["c_Revenue"]);
  });

  it("returns null for LLM territory", () => {
    const plan = parseIntent(
      "classify every row as lead customer or prospect",
      makeCtx([["Desc", ["hi"], "text"]]),
    );
    expect(plan).toBeNull();
  });
});

describe("runAnalysis", () => {
  it("reports missing values with counts", () => {
    const res = runAnalysis(
      "find missing values",
      makeCtx([
        ["A", ["1", ""], "number"],
        ["B", [""], "empty"],
      ]),
    );
    // A: one blank of two (50%); B: one blank of one (100%).
    expect(res?.label).toContain("2 blank cells");
    expect(res?.lines.join("\n")).toContain("A: 1 blank (50%)");
  });

  it("counts duplicate rows", () => {
    const res = runAnalysis(
      "find duplicates",
      makeCtx([
        ["A", ["x", "x", "y"], "text"],
        ["B", ["p", "p", "q"], "text"],
      ]),
    );
    expect(res?.label).toBe("Duplicate rows");
    expect(res?.lines[0]).toContain("1 duplicate");
  });

  it("returns null for unrelated queries", () => {
    expect(runAnalysis("translate this column", makeCtx([]))).toBeNull();
  });
});
