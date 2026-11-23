# test/quint-cloud-qa-launcher.test.mjs
- Lines: 31 | Kind: Quint refinement wrapper (calls `checkCloudQaLauncher` from `specs/quint/refinement/services/cloud-qa-launcher.mjs`) | Verdict: DELETE
- Covers: the Cloud QA launcher stages a private profile and keeps child/receipt custody (22 traces, upstream `private-runtime-launch.mjs`). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-30 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 10-30 | T5 | The 20 lines of assertions read `traceInputs[].steps[].expect`: the **model's** expected states, not source observations. They test the Quint model, which `quint:check` scenarios already do. | If any of these facts matters, state it as a `run …Test` in the `.qnt`. | None |

## Proposed end state
Deleted. `CloudQaLauncher` keeps running once through the services campaign list in the manifest runner.
