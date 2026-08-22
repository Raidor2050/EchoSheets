import { inferSchema, initParser } from "udsv";
import { describe, expect, it } from "vitest";
import { parseIntent } from "../src/features/ai/intent";
import { generateSampleCsv } from "../src/features/import/sampleData";

describe("sample dataset", () => {
  it("parses cleanly with uDSV and feeds the intent parser", () => {
    const { text, name } = generateSampleCsv();
    expect(name).toBe("sample-leads.csv");

    const schema = inferSchema(text);
    const parser = initParser(schema);
    const rows = parser.stringArrs(text) as string[][];

    expect(schema.cols.map((c) => c.name)).toEqual([
      "Full Name",
      "Email",
      "Company",
      "Job Title",
      "Phone",
      "Revenue",
    ]);
    expect(rows.length).toBe(120);
    expect(rows[0]!.length).toBe(6);

    // Every email parses for domain extraction.
    const emailColIdx = 1;
    const emailsWithDomain = rows.filter((r) => /@/.test(r[emailColIdx] ?? "")).length;
    expect(emailsWithDomain).toBe(rows.length);
  });

  it("supports the deterministic domain-extraction demo end to end", () => {
    const { text } = generateSampleCsv();
    const schema = inferSchema(text);
    const parser = initParser(schema);
    const rows = parser.stringArrs(text);

    const columns = schema.cols.map((c, i) => ({
      id: c.name,
      name: c.name,
      type: "text" as const,
      values: rows.map((r) => {
        const v = r[i];
        return v === "" || v === undefined ? null : v;
      }),
    }));
    const ctx = {
      meta: { id: "ds", name: "s.csv", sizeBytes: text.length, importedAt: 0 },
      columns,
    };

    const plan = parseIntent("extract company domain", ctx);
    expect(plan?.id).toBe("extract-domain");
    expect(plan?.targetColIds).toEqual(["Email"]);

    const fn = plan!.fn!;
    expect(fn("ada@acme.com", {})).toBe("acme.com");
  });
});
