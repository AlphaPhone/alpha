# specs/quint/application/ListFocus.qnt
- Lines: 142 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (whole-file transplant)
- Covers: keyed list focus restore across re-renders: restore only the captured logical row, only for the latest commit, never over other focus, hidden/disabled/dialog/hidden-document refusals (`createKeyedListFocus` in `apps/app/src/prototype/keyed-list-focus.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `list-focus.mjs` (+ `list-focus-notes.md`) via `test/quint-list-focus-refinement.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 69 | T2 | Strips the whole file, regex-removes `export`, evals in a vm with JSDOM globals. | Import `createKeyedListFocus` via `sourceModule`. | L |
| 2 | manifest | — | Sources also list `subview-accessibility.ts` and `template.html` (not driven). | Keep as change triggers or drop. | L |
| 3 | 115-141 | — | 20 runs; largest scenario set in the chunk, all valuable edge cases. | Keep. | none |
| 4 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports the module.
