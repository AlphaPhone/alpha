# test/quint-launcher-favorites.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper (calls `checkLauncherFavorites` from `specs/quint/refinement/application/launcher-favorites.mjs`) | Verdict: DELETE
- Covers: shared launcher favorites keep canonical identities and storage choices (21 traces; upstream launcher + `product/alpha-product.ts`). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-12 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `LauncherFavorites` keeps running once through the application campaign list in the manifest runner.
