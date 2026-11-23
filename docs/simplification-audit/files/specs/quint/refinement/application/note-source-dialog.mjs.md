# specs/quint/refinement/application/note-source-dialog.mjs
- Lines: 147 | Kind: Quint ITF trace replay against a bundled product module (import-based, good shape) | Verdict: DELETE
- Covers: the "Source document" dialog of `apps/app/src/prototype/note-source-adapter.ts`. That file is **deleted in this worktree** (D1, delete-candidates A99, legacy-Notes path). Model `specs/quint/application/NoteSourceDialog.qnt`.
- Duplicates: none live. Callers/importers: `test/quint-note-source-dialog.test.mjs` (3 tests incl. two mutation tests that rewrite the deleted file); manifest entry `specs/quint/application/manifest.json:9534`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 22 | A3/D1 | `loadProductModule('apps/app/src/prototype/note-source-adapter.ts')` now fails: the source no longer exists. | Delete this harness, `test/quint-note-source-dialog.test.mjs`, `NoteSourceDialog.qnt` and its manifest row in the same commit (D11: a model of deleted code is not live). | None once product deletion lands. |
| 2 | 7 | — | Imports `notes-files-media-itf.mjs`; that helper survives through other importers. | No action. | — |

## Proposed end state
File removed with its model, manifest entry and test.
