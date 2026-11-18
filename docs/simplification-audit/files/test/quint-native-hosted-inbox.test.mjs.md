# test/quint-native-hosted-inbox.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper (calls `checkNativeHostedInbox` from `specs/quint/refinement/native/hosted-inbox.mjs`) | Verdict: DELETE
- Covers: hosted inbox keeps scoped rows, exact acknowledgements and journal recovery (12 traces). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-9 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | Cross-file | cross-file-actions renames `HostedStorageFault` → `HostedInbox`; the driver lists Java sources by name. | Update the driver with the rename. | Low |

## Proposed end state
Deleted. `NativeHostedInbox` keeps running once through the native campaign list in the manifest runner.
