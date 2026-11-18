# test/quint-mounted-update-admission.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper (calls `checkMountedUpdateAdmission` from `specs/quint/refinement/application/mounted-update-admission.mjs`) | Verdict: DELETE
- Covers: mounted Android updates need the current renderer and exact native activation (7 traces; driver slices `main.tsx`, `settings-adapter.ts` and reads `AlphaDevicePlugin.java`). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-9 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | T10 | Driver reads three product files as text including Java. | PORT note for the harness owner. | Medium |

## Proposed end state
Deleted. `MountedUpdateAdmission` keeps running once through the application campaign list in the manifest runner.
