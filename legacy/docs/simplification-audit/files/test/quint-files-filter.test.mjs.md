# test/quint-files-filter.test.mjs
- Lines: 17 | Kind: Quint refinement wrapper (calls `checkFilesFilter` from `specs/quint/refinement/application/files-filter.mjs`) | Verdict: DELETE
- Covers: Files filters drop late replies from replaced/cleared/cancelled requests (17 traces); a reload retired by view leave cannot publish rows. Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 9-12 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 15-17 | — | `checkRetiredFilesFilterReload` is an extra scenario the aggregate does not run. | Call it from the driver's campaign (or add it as a named model scenario) so the runner covers it. | Low |

## Proposed end state
Deleted. `FilesFilter` keeps running once through the application campaign list in the manifest runner.
