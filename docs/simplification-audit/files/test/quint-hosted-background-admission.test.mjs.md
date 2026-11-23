# test/quint-hosted-background-admission.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper (calls `checkHostedBackgroundAdmission` from `specs/quint/refinement/application/hosted-background-admission.mjs`) | Verdict: DELETE
- Covers: renderer hosted background setup/pause keep attempt and session authority (9 traces; `runtime/hosted-background.ts`). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-11 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `HostedBackgroundAdmission` keeps running once through the application campaign list in the manifest runner.
