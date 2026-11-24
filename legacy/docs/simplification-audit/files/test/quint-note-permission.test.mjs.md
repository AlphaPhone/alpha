# test/quint-note-permission.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper (calls `checkNotePermission` from `specs/quint/refinement/native/note-bridge.mjs`) | Verdict: DELETE
- Covers: the Note bridge rechecks call and lifecycle before queued microphone admission. Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac, 300 s). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-13 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `NotePermission` keeps running once through the native campaign list in the manifest runner.
