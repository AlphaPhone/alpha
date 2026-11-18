# test/quint-pilot-update-refinement.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper (calls `runPilotApkUpdateRefinement` from `specs/quint/refinement/services/pilot-update.mjs`) | Verdict: DELETE
- Covers: scripted pilot update observations refine the update and journal model (12 traces; upstream `apk-release-record.mjs`). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-11 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `PilotApkUpdate` keeps running once through the services campaign list in the manifest runner.
