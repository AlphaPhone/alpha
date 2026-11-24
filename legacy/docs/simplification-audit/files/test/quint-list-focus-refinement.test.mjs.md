# test/quint-list-focus-refinement.test.mjs
- Lines: 16 | Kind: Quint refinement wrapper (calls `listFocus` from `specs/quint/refinement/application/list-focus.mjs`) | Verdict: DELETE
- Covers: list-focus capture and FIFO restore callbacks (`prototype/keyed-list-focus.ts`, 24 traces). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-15 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 12-15 | B5 | 21 literal trace names asserted present. | Gone. | None |
| 4 | — | T10 | Driver strips and slices `keyed-list-focus.ts` into `vm` + JSDOM. | PORT: import the module. | Medium |

## Proposed end state
Deleted. `ListFocus` keeps running once through the application campaign list in the manifest runner.
