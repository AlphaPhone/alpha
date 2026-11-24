# test/previous-notes-source-opening.test.mjs
- Lines: 25 | Kind: transplant scenario (`test/fixtures/previous-notes-source-opening.mjs` slices `agent-adapter.ts` from `'  function canonicalNotesKey('` to `'  function context(shell: Shell)'`) + Quint replay wrapper (`checkPreviousNotesSourceOpening`, 14 traces) | Verdict: DELETE (A1/D1: "previous notes" source mode is a legacy reader)
- Covers: choosing the retired "Previous Notes" source cannot report success from a later epoch. Duplicates: the same campaign runs again inside `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs:60,142`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A1 | Covers only the "previous notes" legacy source (`legacy-notes-access.ts`), which DECISIONS D1 deletes. | Delete this file **and** in the same change: `test/fixtures/previous-notes-source-opening.mjs`, `specs/quint/refinement/application/previous-notes-source-opening.mjs`, its import and list entry in `specs/quint/refinement/application/index.mjs:60,142`, `specs/quint/application/PreviousNotesSourceOpening.qnt` and its `manifest.json` entry (around line 3534). Lower `quint-checker` floor for `application` if it still exists. | Low |
| 2 | 7-19 | T2/P10 | Scenario twin of the replay over the same transplanted fixture. | Deleted with #1. | Low |
| 3 | 24 | P8 | `traces === 14`. | Deleted with #1. | Low |

## Proposed end state
Gone, with its fixture, driver, model and manifest row. Without this, the A2 Notes deletion leaves a red Quint model and
an application aggregate import of a deleted driver.
