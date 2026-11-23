# specs/quint/refinement/application/files-recent-index.mjs
- Lines: 91 | Kind: Quint trace replay; imports `files-index.ts` and `scan-pdf.ts` via `loadProductModule`, but re-implements `selection-adapter.ts` accept/close by copy after asserting its source text | Verdict: PORT
- Covers: the Files Recent index keeps at most the limit, releases each picker grant exactly once (eviction, close-with-forget, tree session end, scan-PDF export), and drops an open document pushed out of Recent. Duplicates: none at behaviour level. Callers/importers: `test/quint-files-recent-index.test.mjs` only (not in the aggregate).
- Model: `FilesRecentIndex.qnt`, live (sources `prototype/files-index.ts`, `selection-adapter.ts`, `scan-pdf.ts`; 11 pinned symbols incl. `RECENT_LIMIT`, `accept`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-22, 49-63 | T1 + T2 | Asserts four literal code strings are present in `selection-adapter.ts` (e.g. `"if (forget \|\| !filesIndex.has(id)) release(id);"`), then runs its own copy of that code. The product sequence is never executed; the text check only proves the copy was made once. All four strings currently match, but `selection-adapter.ts` is modified in the working tree. | Export the two sequences from the selection adapter as small functions over `(filesIndex, release)` (e.g. `clearOpenSelection(forget)` and `recordAccepted(result, recent)`), import them here and delete the strings. | Med |
| 2 | 24-25 | T10 | Rewrites `'export const RECENT_LIMIT=24;'` to 2 by text. | Let `createFilesIndex(store, clock, limit = RECENT_LIMIT)` take the limit; pass 2. | Low |
| 3 | 26-32 | T10 | Stubs keyed by import specifiers of `scan-pdf.ts`. `'../runtime/browser-note-documents'` is no longer imported by `scan-pdf.ts` (dead stub). The `filesIndex` Proxy and `DailyApps` stub route through `globalThis.__alphaFilesPorts`. | Remove the dead stub; keep the others (ports). | Low |
| 4 | 1-6 | – | Header comment honestly states the copy; it will be obsolete after the port. | Rewrite after port. | – |

## Proposed end state
Harness imports `files-index.ts` (limit parameter), the two exported selection helpers and `scan-pdf.ts`; no source reads, no
rewrites; ports for picker grants and the PDF plugin only. One per-model test. Lane: the three product files + model.
