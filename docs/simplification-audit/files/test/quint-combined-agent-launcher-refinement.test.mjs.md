# test/quint-combined-agent-launcher-refinement.test.mjs
- Lines: 33 | Kind: Quint refinement wrapper (calls `checkCombinedAgentLauncher` from `specs/quint/refinement/services/combined-agent-launcher.mjs`) | Verdict: DELETE
- Covers: combined launcher preflight, child custody and SIGTERM/SIGKILL cleanup (21 traces; upstream native-host launcher + `alpha-product-registration.ts`). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-32 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 11-32 | T5 | Assertions inspect model `expect` states of named traces (metadata-write, spawn-error, signal-term…), i.e. the model, not the source. | Move any needed fact into a Quint `run` scenario. | None |

## Proposed end state
Deleted. `CombinedAgentLauncher` keeps running once through the services campaign list in the manifest runner.
