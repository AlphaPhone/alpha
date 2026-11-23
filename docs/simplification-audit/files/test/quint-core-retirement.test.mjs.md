# test/quint-core-retirement.test.mjs
- Lines: 15 | Kind: Quint refinement wrapper (calls `runCoreRetirementRefinement` from `specs/quint/refinement/services/core-runtime/retirement.mjs`) | Verdict: DELETE
- Covers: upstream shared runtime retirement publishes and drains lifecycle work (13 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob; the driver binds this file's path as a hashed source (`loadCoreRuntime([..., 'test/<this file>'])`); deleting the file without removing that literal makes `captureInputs` fail (`core-runtime/retirement.mjs:83`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 9-14 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 13-14 | C5 | `modelStateInventory` + `unobservedStateFields(...) == []` is repeated in six wrappers (core-retirement, core-service-lifecycle, core-shutdown, core-turns, current-approval-service). | Make "no unobserved state field" a generic check in the runner for every receipt. | Low |
| 4 | — | P1 | Model has only `vendor/eliza` sources (research §2.9). | Runner: select only when `upstream.lock.json` changes. | Low |

## Proposed end state
Deleted. `CoreRuntimeRetirement` keeps running once through the services campaign list in the manifest runner.
