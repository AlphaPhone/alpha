# specs/quint/refinement/application/home-failure-notice.md
- Lines: 22 | Kind: harness documentation | Verdict: MERGE into the header comment of `home-failure-notice.mjs`
- Covers: prose description of the HomeFailureNotice campaign (scope, ports, open obligations). Duplicates: the harness `assumptions` strings say the same; the `.qnt` header. Callers/importers: none (not linked from any README or script; grep finds no reference).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | B5 | "Nine source schedules compare 71 checkpoints" repeats counts the wrapper also hard-codes; three copies drift. | Drop counts. | — |
| 2 | 20-22 | T9 | Run instruction names the per-model wrapper that the manifest runner replaces. | Drop. | — |
| 3 | all | C5 | Separate `.md` per harness while `map-plane-ownership.mjs`/`maps-share-choice.mjs` keep this text as a JSDoc header. | One convention: header comment in the harness. | — |

## Proposed end state
Five-line JSDoc at the top of `home-failure-notice.mjs` (what runs, what is a port, what is out of scope); this file deleted.
