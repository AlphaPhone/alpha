# specs/quint/refinement/application/notes-document-transfer.mjs
- Lines: 77 | Kind: Quint ITF trace replay against the bundled real module (import-based; the target shape for ports) | Verdict: KEEP
- Covers: `installNotesDocumentAdapter` in `apps/app/src/prototype/notes-document-adapter.ts` (live, imported by `main.tsx:144`): export-as-text receipt only in the visit that started it, deferred to a visible page, one operation at a time; plus the test-mocks-only "Import text file". Model `NotesDocumentTransfer.qnt`.
- Duplicates: no Playwright spec exercises Notes export. Callers: `test/quint-notes-document-transfer.test.mjs` (1 replay + 2 mutation tests via `rewrite`); manifest row `manifest.json:7607`. Not in the application aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | D5 | Stubs `../build-flags` to `testMocksEnabled=true` so the import half (dev surface) runs. | Keep while D6 keeps the dev import. If the owner treats Notes import as part of D3 (import/export deleted), drop `importText`, `saveImportedNote` and the import half of the model. | Owner decision (see chunk questions). |
| 2 | 43 | A7 | `saveImportedNote` was also consumed by the deleted note-source adapters; after their deletion only the dev import uses it. | Product chunk: inline it into the import path. | Low. |
| 3 | 32-35 | — | Replaces `globalThis.document` with a minimal object instead of JSDOM. Fine for this module. | None. | — |

## Proposed end state
Unchanged harness; it already imports the real module through `loadProductModule` with port stubs. Rebase it on the merged replay helper (see `notes-files-media-itf.mjs`).
