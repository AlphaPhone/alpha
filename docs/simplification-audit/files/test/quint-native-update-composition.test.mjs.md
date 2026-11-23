# test/quint-native-update-composition.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper (calls `checkNativeUpdateComposition` from `specs/quint/refinement/native/update-composition.mjs`) | Verdict: DELETE
- Covers: native readiness, durable pause and resident lease compose through update settlement (≥6 of 7 traces; one may be skipped as `ambiguous-terminal-sync`). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-11 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 9-11 | B5 | Tolerates a skipped trace by name; the skip should be explicit in the driver, not in each caller. | Gone. | None |

## Proposed end state
Deleted. `NativeUpdateComposition` keeps running once through the native campaign list in the manifest runner.
