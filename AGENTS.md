# AGENTS.md — EchoSheets agent handbook

Instructions for any human or AI agent continuing work on this repository.

## What this project is

EchoSheets is an AI-native spreadsheet: CSV in → natural-language transforms →
preview every change → apply atomically → CSV out. The grid is always the
hero; AI never silently mutates data.

## Architecture in one paragraph

React 19 SPA (Vite). Zustand stores: `sheet` (columnar data + undo/redo
history), `staging` (AI preview diffs), `ui` (panels/selection). CSV parses in
a Web Worker (uDSV). The grid is glide-data-grid (canvas, virtualized).
Deterministic transforms run locally and instantly; LLM transforms go through
`src/features/ai/provider.ts` (OpenAI-compatible chat/completions with strict
JSON-schema response_format + zod validation) batched by
`src/features/ai/executor.ts`. Results stage as ghost cells until Apply writes
one history entry.

## Hard constraints

1. **Never commit secrets.** `.env` is gitignored; BYO keys live only in the
   user's localStorage at runtime.
2. **Never mutate data without a preview path** for AI operations and an
   undoable history entry for all mutations.
3. **Keep parsing off the main thread.** Any new heavy work goes in
   `src/workers/`.
4. **Strict TypeScript.** `npm run typecheck` must stay clean. Do not weaken
   tsconfig.
5. **Dependency discipline.** Every new dependency needs a documented reason
   (license MIT/Apache/ISC, maintenance, why alternatives fail) in
   `docs/implementation.md`. Note: `.npmrc` uses `legacy-peer-deps` because
   glide-data-grid's peer range excludes React 19 — revisit if GDG updates.
6. **AMOLED design language.** Pure black surfaces, hairline borders, accent
   budget ≤5%, no purple gradients, no glassmorphism. Tokens live in
   `src/styles/app.css` @theme block. Respect `prefers-reduced-motion`.

## Commands

```
npm run dev         # Vite dev server
npm run lint        # Biome check (must pass before push)
npm run typecheck   # tsc --noEmit (must pass)
npm test            # Vitest suite (must pass)
npm run build       # typecheck + production bundle
```

CI runs lint/typecheck/test on every push and PR; the deploy workflow builds
with `ECHOSHEETS_PAGES=1` (sets base `/EchoSheets/`) and publishes `dist/` to
GitHub Pages.

## Coding standards

- Biome formats everything (2-space, double quotes, semicolons). Run
  `npx @biomejs/biome check --write .` before committing.
- Comments only where intent isn't obvious from code.
- Components stay presentative; logic lives in stores/executors so it stays
  unit-testable without DOM.
- All user-facing strings avoid jargon ("staged changes", not "diff buffer").

## Where things live

```
src/app/        shell: TopBar, StatusBar, SettingsModal, HistoryPanel, App
src/features/
  ai/           CommandBar, intent.ts (rules), executor.ts, provider.ts,
                stagingStore.ts (preview), PreviewBar
  grid/         DataGrid (GDG wrapper), gridTheme.ts
  import/       ImportScreen, sampleData
  export/       exportCsv
src/lib/dataset/ store.ts (data+history), parseBridge, serializeCsv, inferTypes
src/workers/    csv-parse.worker.ts
tests/          vitest suites mirroring the above
docs/           implementation.md (architecture), progress.md (status)
```

## Testing requirements

New logic requires tests. Parsers/serializers need round-trip cases;
transforms need edge cases (empty, malformed); anything touching history must
assert undo restores exact prior state. Run the full gate:

```
npm run lint && npm run typecheck && npm test && npm run build
```

## Roadmap order (suggested next steps)

1. Server proxy mode (Hono, SSE streaming, env keys — see .env.example)
2. IndexedDB persistence of datasets + operation ledger (Dexie)
3. Per-cell accept/reject diff UI refinement
4. XLSX/JSON import-export
5. Operation replay ("recipes") export/import
