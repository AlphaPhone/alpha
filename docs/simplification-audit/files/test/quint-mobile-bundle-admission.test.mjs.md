# test/quint-mobile-bundle-admission.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper (calls `checkMobileBundleAdmission` from `specs/quint/refinement/services/mobile-bundle-admission.mjs`) | Verdict: DELETE
- Covers: mobile bundle receipt admission matches reviewed inputs, transforms and readback (11 traces; build tooling over upstream `committed-source.mjs`). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-9 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `MobileBundleAdmission` keeps running once through the services campaign list in the manifest runner.
