# EchoSheets

**The AI-native spreadsheet.** Upload data, transform it with natural language,
preview every change before it touches your file, and export anywhere.

Inspired by [Hugging Face AISheets](https://github.com/huggingface/aisheets) —
rebuilt from scratch with a spreadsheet-grade engine, a preview-first AI
workflow, and a true AMOLED-black interface.

## Features

- **Drag-and-drop CSV import** — parsed off the main thread in a Web Worker;
  100MB+ files stay responsive. Automatic type detection per column.
- **Canvas-rendered virtualized grid** (glide-data-grid) — smooth scrolling on
  six-figure row counts, inline editing, range/row/column selection.
- **⌘K AI command bar** — ask in plain English: *extract domains*, *classify
  leads*, *normalize whitespace*, *find missing values*.
- **Deterministic fast path** — trims, case transforms, domain extraction,
  rounding and currency stripping run locally: instant, free, verifiable.
- **LLM operations with structured output** — any OpenAI-compatible provider
  (OpenAI, OpenRouter, Groq, local Ollama). Strict JSON-schema responses,
  batched with bounded concurrency, automatic retries on rate limits,
  full cancellation support.
- **Preview → Apply → Undo** — every AI change lands in a ghost overlay first.
  Click any cell to exclude it, retry only the failed ones, then apply atomically.
- **Operation history** — every edit and AI run is a ledger entry; ⌘Z / ⌘⇧Z undo
  and redo whole operations, not just cells.
- **Safe CSV export** — RFC-4180 serializer with formula-injection neutralization.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

No API key needed to start — the deterministic operations work fully offline.
To enable LLM-powered operations, press `⌘K` → *Connect AI provider…*

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm test` | Vitest suite (39 tests) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome check |

## Configuration

EchoSheets runs entirely client-side by default ("bring your own key" mode):
provider settings are stored in your browser's local storage and sent directly
to the endpoint you choose. Nothing is uploaded anywhere else.

`.env.example` documents the optional server-proxy deployment for keeping keys
server-side.

## Tech stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · Zustand ·
glide-data-grid · uDSV (Web Worker) · cmdk · motion · sonner · zod · Biome · Vitest

See [implementation.md](docs/implementation.md) for architecture details and
dependency rationale, and [progress.md](docs/progress.md) for current status.

## Roadmap

- Server-side proxy mode (Hono API, SSE streaming)
- Operation ledger persistence via IndexedDB (survive refresh)
- Multi-format import/export (XLSX, JSON, Parquet)
- Per-cell accept/reject diff review UI
- Range-restricted LLM operations (`B2:E200`)
- Additional model providers + local model auto-discovery

## Contributing

Issues and PRs welcome. Run `npm run lint && npm run typecheck && npm test`
before submitting. Architecture conventions live in [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
