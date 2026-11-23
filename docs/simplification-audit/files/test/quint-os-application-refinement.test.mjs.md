# test/quint-os-application-refinement.test.mjs
- Lines: 21 | Kind: Quint refinement wrapper (calls `checkOSDefaults / checkOSProvisioning / checkOSSourceStaging` from `specs/quint/refinement/application/os-*.mjs`) | Verdict: DELETE
- Covers: OS defaults, provisioning and source staging execute OS-image source with retained inputs (13/12/7 traces). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-14 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 15-20 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 19-20 | B5, T1 | Asserts the receipt's `sourceHashesBefore` includes `application/index.mjs` and `test/quint-application-refinement.test.mjs`: couples a wrapper to the aggregate test file's name. | Gone; also remove that path from the drivers' extra sources when the aggregate is replaced. | Medium |
| 4 | 16-17 | B5 | Generated-source snapshot bookkeeping. | Gone. | None |

## Proposed end state
Deleted. `OSDefaults, OSProvisioning, OSSourceStaging` keeps running once through the application campaign list in the manifest runner.
