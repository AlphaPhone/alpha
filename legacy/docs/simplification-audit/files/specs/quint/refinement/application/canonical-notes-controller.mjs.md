# specs/quint/refinement/application/canonical-notes-controller.mjs
- Lines: 136 | Kind: Quint refinement harness (esbuild bundle of the real controller via `bundledSource`) | Verdict: KEEP
- Covers: `CanonicalNotesController` (`apps/app/src/prototype/canonical-notes-controller.ts`, 33 lines) plus the upstream `NotesController`/snapshot state it wraps: read coalescing, write-time read abort, invalidation, retirement, owner loss, same-session event filtering. Duplicates: `contracts.mjs` `notesLifecycle` canonical block (one read/edit/save) is a strict subset. Callers: `test/quint-canonical-notes-controller.test.mjs`, `index.mjs`; `createCanonicalNotesFixture` is imported by `canonical-notes-draft.mjs` (and transitively `canonical-notes-mutation.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 73 | — | Imports the real module (bundled). No slicing. | None. | — |
| 2 | 28-44 | — | Reads private/upstream fields (`controller.read`, `readAbort`, `state.value`, `writing`, `invalidated`). These are upstream `NotesController` fields; an upstream rename breaks the harness. | Accept; note as upstream-coupled. | L |
| 3 | 13-15 | B4 | Wraps `addEventListener`/`removeEventListener` on a local `EventTarget` to count listeners. Fine for a fixture. | None. | — |
| 4 | 9 | C5 | `createCanonicalNotesFixture` is a shared fixture living in a harness file; three harnesses import it. | Move to `specs/quint/refinement/application/notes-fixtures.mjs` together with `createCanonicalNotesEditorFixture` and `createCanonicalNotesUiFixture`. | L |
| 5 | 74-127 | D9 | Scenario dispatch by string comparisons in one loop. | Table of named scenario functions when touched. | L |

## Proposed end state
Same campaign; fixture factory moved to a shared notes fixture module; per-model test only.
