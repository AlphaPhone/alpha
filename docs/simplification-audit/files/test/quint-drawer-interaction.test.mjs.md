# test/quint-drawer-interaction.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper (calls `checkDrawerInteraction` from `specs/quint/refinement/application/drawer-interaction.mjs`) | Verdict: DELETE
- Covers: the mounted Apps drawer keeps pointer, menu and App Info ownership (22 traces) — the component is upstream `upstream renderer: mobile-shell/InstalledAppsGridDrawer.tsx`. Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the application aggregate already runs (esbuild + Chromium). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-12 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | P1 | Upstream-only source. | Select on `upstream.lock.json` change. | Low |

## Proposed end state
Deleted. `DrawerInteraction` keeps running once through the application campaign list in the manifest runner.
