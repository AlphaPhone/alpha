# specs/quint/refinement/application/notes-coordinator.mjs
- Lines: 139 | Kind: Quint refinement harness, source transplant of `agent-adapter.ts` (T2/T10) | Verdict: DELETE
- Covers: legacy Notes `vset` + encrypted draft retention with `SecureNotesStore` (`notesSourceMode:'legacy'`, model `NotesLifecycle` via `initLegacy`). D1 deletes the legacy Notes editor; `agent-adapter.ts` in this worktree no longer contains `const notesDataset=`, `SecureNotesStore` or `notesSourceMode` (grep: 0 hits), so the anchors at 49-51 already fail.
- Duplicates: none. Callers/importers: `test/quint-notes-coordinator-refinement.test.mjs`, `index.mjs:19` (aggregate), `README.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-60 | T2/T10, A1 | Slices `agent-adapter.ts` between `  const notesDataset=` / `  /** Android: after a clean open` and `  p.vset = function (key: string` / `  p.api = function`, strips types and evals with fakes. The first pair no longer exists. | Delete harness, its test, its `index.mjs` import/adapter entry, `notes-coordinator-notes.md`. | None. |
| 2 | 108-109 | B5 | Writes `test-results/quint-refinement/notes-coordinator-source.json`; nothing reads it. | Goes with the file. | — |
| 3 | 124 | — | Model `NotesLifecycle.qnt` keeps `initLegacy` and `failedSaveKeepsDraftTest = initLegacy...` (lines 27, 88, 220). | Model chunk: remove the legacy mode from `NotesLifecycle.qnt` (or confirm the canonical half is refined elsewhere). | Model must keep passing (D11). |

## Proposed end state
Removed. `SecureNotesStore` still serves `runtime/notes-trash.ts` and `note-audio-deletions.ts`; if its uncertain-commit/draft-retention behaviour matters for canonical Notes, cover it in `journeys/notes.spec.ts` (edit, storage failure, reopen) rather than here.
