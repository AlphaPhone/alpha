# test/notes-trash-read.test.mjs
- Lines: 33 | Kind: transplant (via `test/fixtures/notes-trash-read.mjs`, which esbuild-transforms `prototype/notes-trash-adapter.ts` into a `vm`) + Quint refinement wrapper (`checkNotesTrashReadPublication`) | Verdict: DELETE
- Covers: Previous Notes (legacy) Trash read publication: a superseded read or a held error after a source switch cannot repaint. Duplicates: the same driver runs in `specs/quint/refinement/application/index.mjs:57,139` (aggregate). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 19-22 | A1 | Every case calls `chooseSource('legacy')`; the adapter returns early unless the source is legacy (`notes-trash-adapter.ts`). Whole adapter is delete-candidate A99 → C1 (D1). | Delete test, fixture, refinement driver `notes-trash-read-publication.mjs`, its index entry and the `NotesTrashReadPublication` model together. | None |
| 2 | 28-33 | T4, B5 | Re-runs the aggregate's refinement; asserts receipt counts. | Gone. | None |

## Proposed end state
Deleted with `test/fixtures/notes-trash-read.mjs`, the refinement driver and the Quint model (a model of deleted code is not live, D20/D11). Canonical Notes Trash stays covered by `test/browser/notes-trash.spec.ts`.
