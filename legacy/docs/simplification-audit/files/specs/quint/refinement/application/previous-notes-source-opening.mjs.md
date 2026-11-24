# specs/quint/refinement/application/previous-notes-source-opening.mjs
- Lines: 64 | Kind: Quint refinement harness over a transplant fixture (`test/fixtures/previous-notes-source-opening.mjs` slices `agent-adapter.ts` between `  function canonicalNotesKey(` and `  function context(shell: Shell)` and runs it in a VM with `legacy-notes-access.ts`) | Verdict: DELETE (legacy "Previous Notes" source selection — D1/A1)
- Covers: choosing the legacy vs canonical Notes source, retention-task ordering, owner change, read-only admission of retained drafts. Duplicates: `test/previous-notes-source-opening.test.mjs` first case drives the same fixture. Callers/importers: `index.mjs:60,142`, `test/previous-notes-source-opening.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | A1, T2 | Fixture depends on `apps/app/src/prototype/legacy-notes-access.ts`, already deleted in this worktree; the harness cannot load. | Delete this file, `test/fixtures/previous-notes-source-opening.mjs`, `test/previous-notes-source-opening.test.mjs`, `specs/quint/application/PreviousNotesSourceOpening.qnt`, its manifest entry (~l.3534) and the `index.mjs` entry. | None |
| 2 | 26-59 | — | 14 scenarios all about "legacy" vs "canonical" selection; nothing here concerns canonical Notes alone (that has `CanonicalNotesController`/`CanonicalNotesDraft`). | Nothing to carry. | None |

## Proposed end state
Gone, with the fixture, wrapper test, model and manifest row.
