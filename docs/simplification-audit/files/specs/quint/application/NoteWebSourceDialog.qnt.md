# specs/quint/application/NoteWebSourceDialog.qnt
- Lines: 83 | Kind: Quint model (live; ITF trace-replay harness) | Verdict: DELETE
- Covers: Web-source dialog of a summary note: one action per dialog, visit aborts on close, saved removal closes the dialog. Duplicates: none. Callers/importers: manifest row (source `apps/app/src/prototype/note-web-source-adapter.ts`, 6 symbol pins); harness specs/quint/refinement/application/note-web-source-dialog.mjs (import-based via loadProductModule); wrapper test/quint-note-web-source-dialog.test.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | A1 | Source `note-web-source-adapter.ts` is in C1/A99 (legacy notes engine, D1) and already deleted in the worktree. | Delete model, row, harness, wrapper. | L |
| 2 | manifest | P6 | quint-lib.ts:233 `readFileSync`s every manifest `sources` entry; this file is already deleted in the worktree, so every Quint command (`quint:check`, `quint:changed`, refinement) throws before any model runs until this row is removed. | Remove row now. | H |
| 3 | 70-83 | B5 | Seven runs + six witnesses for a 28-line adapter: heavy evidence for small code. | Gone with the model. | L |

## Proposed end state
Deleted with its harness and wrapper. No surviving product code is modeled here.
