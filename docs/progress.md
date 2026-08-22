# EchoSheets — Progress

## Status: v0.1.0 — deployed to GitHub Pages

## Completed

### Phase 1–3 · Research & architecture
- Studied Hugging Face AISheets (Qwik, column-centric AI generation, Apache-2.0)
- 5 research agents: product design, frontend architecture, AI/data architecture,
  systems architecture, open-source design language
- Unified stack decided; disagreements resolved (AI SDK rejected in favor of a
  single in-repo OpenAI-compatible client; GDG chosen over DOM grids)

### Phase 5 · Foundation
- Vite 7 + React 19 + TypeScript strict scaffold; Tailwind v4 AMOLED token system
- Columnar dataset store (`src/lib/dataset/store.ts`) with atomic patch engine
- Undo/redo history: per-operation inverse patches, capped ledger
- uDSV CSV parsing in Web Worker with progress reporting; type inference
- glide-data-grid canvas grid: selection (cell/range/rows/cols), inline editing,
  Delete-to-clear, virtualized rendering
- Import screen: drag-drop, size guards, parse summary card with detected types,
  suggested first moves, built-in messy sample dataset (120 rows)

### Phase 6 · AI operations
- ⌘K command bar (cmdk): scoped badge, deterministic quick ops, free-text → AI
- Deterministic intent parser: extract-domain, trim/case transforms,
  whitespace normalize, rounding, currency stripping (zero-cost local runs)
- Analyses: missing-value scan and duplicate-row detection with rich toasts
- LLM executor: OpenAI-compatible chat/completions with strict JSON-schema
  response_format, zod validation, batches of 10 rows, concurrency 3,
  exponential backoff on rate limits/network errors, AbortController cancellation
- Staging store + ghost-cell preview overlay in the grid (green staged /
  amber excluded / red failed / blue pending), click-to-exclude per cell
- PreviewBar: live progress %, cancel, retry-failed (deterministic + LLM),
  Apply writes one atomic undoable history entry
- BYO-key provider settings modal (localStorage only, privacy note)

### Phase 7–8 · Polish & testing
- sonner toasts, motion micro-interactions with `prefers-reduced-motion` support
- History slide-over panel; status bar with selection A1 ref + provider status
- Export: RFC-4180 serializer with OWASP formula-injection neutralization
- 39 vitest tests: CSV round-trip/injection, type inference, history atomicity,
  staging commit semantics, intent rules, sample-dataset end-to-end through real uDSV

### Phase 9–11 · Audits & deployment
- Security pass: injection-neutralized export, prompt-injection defenses
  (cell escaping, canary, schema-constrained outputs, rowId echo verification)
- GitHub Actions CI (lint + typecheck + tests) and Pages deploy workflow

## Known limitations / next steps
1. Server proxy mode (Hono SSE) so keys never touch the browser — .env.example ready
2. IndexedDB persistence of datasets + operation ledger (Dexie)
3. Range-restricted LLM ops ("just B2:E200") — plumbing exists, parser rule pending
4. Per-cell accept/reject refinement (currently click-to-toggle exclusion)
5. XLSX/JSON import-export; operation replay ("recipes")
6. E2E Playwright suite (grid interactions on canvas need browser-mode testing)

## Bugs fixed during development
- GDG v6 packaging: missing declared deps (lodash, marked, react-number-format,
  react-responsive-carousel, canvas-hypertxt) — installed explicitly
- GDG peer range excludes React 19 → `.npmrc legacy-peer-deps`
- GDG v6 API renames: `onGridSelectionChange`, `GridSelection.current.range`,
  enum `GridCellKind.Text`
- uDSV API: inferSchema/initParser instead of assumed csvParse
- Deployed site rejected every CSV: a vite incremental-cache glitch emitted
  dist without the csv-parse.worker chunk, so the Worker 404'd. Fix: parsing
  logic extracted into pure `lib/dataset/csvParse.ts` shared by worker +
  main-thread fallback (`parseBridge` falls back when the worker can't start),
  plus a postbuild `scripts/check-dist.mjs` guard that fails the build if the
  worker chunk is missing
- Editor rendered as a black screen after import: glide-data-grid v6 ships its
  layout styles as static CSS (@linaria build output) that must be imported
  explicitly; without it the grid container collapses to zero height, GDG's
  ResizeObserver never reports a size, and InfiniteScroller renders an empty
  div forever. Fix: `main.tsx` imports
  `@glideapps/glide-data-grid/dist/index.css`; Playwright e2e smoke gate
  (`npm run e2e`) now asserts `data-grid-canvas` lays out at real dimensions
