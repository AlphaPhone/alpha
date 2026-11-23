# specs/quint/refinement/application/note-web-source-dialog.mjs
- Lines: 78 | Kind: Quint ITF trace replay against a bundled product module | Verdict: DELETE
- Covers: the "Web source" dialog in `apps/app/src/prototype/note-web-source-adapter.ts`, **deleted in this worktree** (D1, A99). Model `NoteWebSourceDialog.qnt`.
- Duplicates: none. Callers/importers: `test/quint-note-web-source-dialog.test.mjs` (3 tests, two mutations of the deleted file); manifest row `manifest.json:9636`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 15 | A3/D1 | Loads a deleted source; the replay can no longer run. | Delete with its test, model and manifest row. | None. |

## Proposed end state
Removed.
