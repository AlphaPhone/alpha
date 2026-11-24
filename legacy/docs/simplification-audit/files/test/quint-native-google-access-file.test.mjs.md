# test/quint-native-google-access-file.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper (calls `runNativeGoogleAccessFileRefinement` from `specs/quint/refinement/services/native-google-access-file.mjs`) | Verdict: DELETE
- Covers: JVM access file and loopback host refine private file admission and recovery (`GoogleAgentAccessFile.java`, `AlphaLocalAgentPlugin.java`; 7 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Second execution of a campaign the services aggregate already runs (esbuild + javac). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-12 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `NativeGoogleAccessFile` keeps running once through the services campaign list in the manifest runner.
