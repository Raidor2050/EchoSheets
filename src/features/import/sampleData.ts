/** Built-in demo dataset — intentionally messy so AI/deterministic ops shine. */

const FIRST = [
  "ava",
  "Noah",
  "MIA",
  "Liam",
  "zoe",
  "Ethan",
  "luna",
  "Kai",
  "iris",
  "Owen",
  "Nora",
  "Finn",
  "june",
  "Leo",
  "Ruth",
  "Theo",
  "ivy",
  "Milo",
  "cleo",
  "Jude",
];
const LAST = [
  "Nguyen",
  "GARCIA",
  "smith",
  "Okafor",
  "Kim",
  "novak",
  "Silva",
  "Cohen",
  "muller",
  "Rossi",
  "hansen",
  "Patel",
  "dubois",
  "Moretti",
  "tanaka",
  "Weber",
  "costa",
  "Ivanov",
  "reyes",
  "Bell",
];

const COMPANIES = [
  "  acme corp",
  "Google",
  "  vertex LABS ",
  "northwind co",
  "helios energy",
  "quantum byte",
  "  bluefin ",
  "ORBIT systems",
  "pinecone ltd",
  "meridian group",
];

const TITLES = [
  "head of growth",
  "SENIOR ENGINEER",
  "product manager",
  "cto",
  "data analyst",
  " VP SALES ",
  "designer",
  "marketing lead",
];

export function generateSampleCsv(): { text: string; name: string } {
  const rows: string[][] = [];
  const n = 120;
  for (let i = 0; i < n; i++) {
    const first = FIRST[i % FIRST.length] ?? "";
    const last = LAST[(i * 7) % LAST.length] ?? "";
    const company = COMPANIES[(i * 3) % COMPANIES.length] ?? "";
    const domain =
      company
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "") || "acme";
    const name = `${first} ${last}`;
    const emailLocal = i % 5 === 0 ? first : `${first}.${last.toLowerCase()}`;
    const email = `${emailLocal.replace(/\s/g, "")}@${domain}.com`;
    const title = TITLES[(i * 11) % TITLES.length] ?? "";
    const revenue =
      i % 9 === 0
        ? ""
        : `$${(((i * 137) % 9000) + 120).toLocaleString("en-US")}.${(i * 13) % 100}`.replace(
            ",",
            ",",
          );
    const phone =
      i % 7 === 0
        ? `+1 (${200 + (i % 700)}) ${100 + i}-${1000 + i * 3}  `.padEnd(18)
        : `(415) 555-0${String(100 + (i % 800)).slice(0, 3)}`;
    rows.push([name, email, company, title, phone, revenue]);
  }

  const header = "Full Name,Email,Company,Job Title,Phone,Revenue";
  const body = rows
    .map((r) => r.map((v) => (/[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(","))
    .join("\n");
  return { text: `${header}\n${body}`, name: "sample-leads.csv" };
}
