# test/quint-maps-reroute-ownership.test.mjs
- Lines: 32 | Kind: Quint refinement wrapper (calls `checkMapsRerouteOwnership` from `specs/quint/refinement/application/maps-reroute-ownership.mjs`) | Verdict: DELETE
- Covers: mounted Maps settles an agent reroute for the exact guidance and route request (7 named traces). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the application aggregate already runs (Chromium, 420 s). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-31 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 8-31 | T5 | 24 assertions on model `expect` values (`s.agent`, `s.origin`, `s.watches`…). | Gone; state needed facts as Quint scenarios. | None |

## Proposed end state
Deleted. `MapsRerouteOwnership` keeps running once through the application campaign list in the manifest runner.
