# specs/quint/refinement/application/notes-trash-read-publication.mjs
- Lines: 58 | Kind: Quint refinement harness over a fixture that drives the Trash adapter | Verdict: DELETE
- Covers: "Previous notes" (legacy source) Trash read publication in `apps/app/src/prototype/notes-trash-adapter.ts`, **deleted in this worktree** (D1, A99). Model `NotesTrashReadPublication.qnt` lists `notes-trash-adapter.ts` as its source (`manifest.json:3575`).
- Duplicates: `test/notes-trash-read.test.mjs` repeats two schedules as example tests (T4) and calls this harness. Importers: that test, `index.mjs:57`; fixture `test/fixtures/notes-trash-read.mjs` (only importers: this file and that test, so it dies too).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-51 | A1/D1 | Every schedule but one starts with `chooseSource('legacy')` ("Select Previous notes"). The canonical case only asserts that canonical mode does not read. | Delete harness, `test/notes-trash-read.test.mjs`, `test/fixtures/notes-trash-read.mjs`, `NotesTrashReadPublication.qnt` and its manifest row, and the `index.mjs` entry. | None. |

## Proposed end state
Removed. Canonical Notes Trash (`runtime/notes-trash.ts`) needs journey coverage in `journeys/notes.spec.ts` (delete, open Trash, restore) if not already present.
