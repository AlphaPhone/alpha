# test/quint-dock-clearance-ownership.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper (calls `checkDockClearanceOwnership` from `specs/quint/refinement/application/dock-clearance-ownership.mjs`) | Verdict: DELETE
- Covers: layout observers publish current header clearance and keep the last dock footprint (5 traces; driver strips `main.tsx`/`dock-clearance.ts` into `vm` + JSDOM). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-9 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `DockClearanceOwnership` keeps running once through the application campaign list in the manifest runner.
