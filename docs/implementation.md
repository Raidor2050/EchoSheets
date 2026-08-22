# EchoSheets — Implementation & Architecture

## Product architecture

EchoSheets is an AI-native spreadsheet: CSV in → transform with natural language → preview → apply atomically → CSV out.
One screen does the work; the grid is always the hero.

**Core loop:** Import → Inspect (typed columns) → Ask (⌘K) → Preview ghost diff → Apply/Discard/Retry-failed → Undo/Redo → Export.

## Technical architecture

```
┌─ Browser ───────────────────────────────────────────────┐
│ React 19 shell                                          │
│   glide-data-grid canvas grid (virtualized)             │
│   Zustand stores: sheet (data+history) · staging · ui   │
│   uDSV parser inside Web Worker                         │
│   Deterministic ops registry (local fast path)          │
│   LLM client → OpenAI-compatible /chat/completions      │
│     strict JSON-schema response_format + zod validation │
│     batches of 10 rows · concurrency 3 · retries · abort│
│   Staging store = shadow values rendered as ghost cells │
└─────────────────────────────────────────────────────────┘
          │ BYO-key direct mode (localStorage creds)
          ▼
   Any OpenAI-compatible provider
   (OpenAI · OpenRouter · Groq · local Ollama)
```

### Data model (columnar)

- `Column { id, name, type: text|number|date|boolean|empty, values: (string|null)[] }`
- Column-major storage keeps AI column ops and type inference O(col); cell edits copy one column array once.
- `CellPatch { colId, row, from, to }` — the atomic unit of change.

### History (undo/redo)

Every edit or applied AI op is a `HistoryEntry { id, label, kind: edit|ai|structural, patches[] }`.
Undo applies inverse patches; redo replays forward ones. Atomic per operation, capped at 100 entries.

### AI operation pipeline

1. **IntentParser** (`features/ai/intent.ts`) — deterministic regex rules first:
   extract-domain, trim/case transforms, whitespace normalize, round,
   strip-currency. Zero cost, instant, verifiable.
2. **Analyses** (`runAnalysis`) — missing-value scan and duplicate-row detection run locally.
3. **Planner** — unmatched queries become LLM plans (`makeLlmPlan`) targeting a new output column.
4. **Executor** (`features/ai/executor.ts`):
   - deterministic: chunked 4000 rows/event-loop-yield, per-cell error isolation
   - llm: batches of 10 rows/request, concurrency 3, exponential backoff on
     429/network (2 retries), full AbortController cancellation, per-batch zod validation
5. **StagingStore** — results land in a shadow map; grid renders them as tinted ghost cells
   (green=staged, amber=excluded, red=failed). Nothing touches real data until Apply.
6. **Apply** → single atomic history entry + toast. **Retry failed** re-runs only error cells.

### Prompt & injection safety

- Cell data wrapped in `<cell col="…">…</cell>` with closing-tag escaping and `<` zero-width padding
- System envelope declares data untrusted; task stated once; canary embedded
- Strict `response_format: json_schema` constrains outputs to `{results:[{rowId,value}]}`
- RowId echo verified against the requested batch; unknown rowIds dropped

## Dependency decisions

| Package | License | Why | Rejected alternative |
| --- | --- | --- | --- |
| react 19 | MIT | ecosystem mainstream | Qwik (AISheets' choice — smaller talent pool) |
| @glideapps/glide-data-grid 6 | MIT | canvas rendering, built-in selection/editing | TanStack Virtual custom DOM grid (weeks of edge cases) |
| udsv | MIT | fastest RFC-4180 parser, worker-friendly | PapaParse (slower) |
| zustand | MIT | store slices without providers | Redux Toolkit (ceremony) |
| cmdk | MIT | accessible ⌘K primitives | building our own |
| motion | MIT | WAAPI-backed micro-interactions + reduced-motion | GSAP (license) |
| sonner | MIT | tasteful toasts | — |
| lucide-react | ISC | consistent 1.5px stroke icons | Geist icons (brand-tied) |
| zod 4 | MIT | schema validation of model output | valibot (fine; zod deeper in AI tooling) |
| vite 7 + vitest | MIT | first-class Windows DX | webpack/jest (slower) |
| @biomejs/biome | MIT | lint+format in one fast tool | eslint+prettier (two configs) |
| playwright (dev) | Apache-2.0 | headless e2e: proves the grid canvas actually mounts and lays out before deploy; catches silent chunk/style loss unit tests can't see | puppeteer (Chromium-only licensing friction) |

Known quirk: GDG 6.0.3 under-declares runtime deps (lodash, marked,
react-number-format, react-responsive-carousel, canvas-hypertxt) and its peer range
excludes React 19 — handled via explicit deps + `.npmrc legacy-peer-deps`.
GDG also compiles its layout styles (@linaria) to static CSS that is never
injected at runtime: `main.tsx` must import
`@glideapps/glide-data-grid/dist/index.css`, otherwise the grid container has
zero height and the canvas never mounts (blank editor).

## Folder structure

```
src/
├── app/            App shell, TopBar, StatusBar, SettingsModal, HistoryPanel
├── components/ui/  Button, Kbd primitives
├── features/
│   ├── ai/         CommandBar, intent, executor, provider, stagingStore, PreviewBar
│   ├── export/     RFC-4180 sanitized CSV download
│   ├── grid/       DataGrid (GDG wrapper), AMOLED theme, ghost overlays
│   └── import/     ImportScreen dropzone, sample dataset
├── lib/
│   ├── dataset/    store (data+undo), inferTypes, serializeCsv, parseBridge
│   ├── uiStore.ts  panels/selection state
│   └── id.ts, utils.ts
├── styles/app.css  Tailwind v4 tokens (@theme)
├── types/          shared domain types
└── workers/        csv-parse.worker.ts
tests/              vitest unit/integration suite
docs/               this file + progress.md
```

## Performance strategy

- Parse off main thread; progress messages every 25k rows
- Canvas grid virtualizes rendering by design; ghost previews cost one drawCell override
- Executor yields to event loop every 4000 rows (deterministic) / streams batch completions (LLM)
- No whole-grid re-renders: getCellContent reads stores imperatively via closures

## Security model

- Files parsed locally; nothing uploaded in client-only mode
- BYO keys live in localStorage only, sent solely to the user-configured endpoint
- Export sanitizes formula injection (=,+,-,@,tab leads) per OWASP guidance
- Model outputs schema-constrained; injected directives cannot alter other rows

## Testing

Vitest unit/integration: CSV round-trip + injection sanitization, type inference,
history undo/redo atomicity, staging commit semantics (new-column + replace),
intent rules, deterministic transforms, sample-dataset end-to-end through real uDSV parsing.

Playwright e2e (`npm run e2e`): boots the production bundle, imports the sample
dataset headlessly, and fails unless `data-grid-canvas` lays out at real
dimensions — guards against missing GDG CSS or dropped worker chunks.

## Deployment

Static build (`dist/`) deploys to GitHub Pages via Actions (`ECHOSHEETS_PAGES=1` sets base `/EchoSheets/`).
CI runs lint + tests on every push/PR.
