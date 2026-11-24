# test/quint-native-recording.test.mjs
- Lines: 20 | Kind: Quint refinement wrapper (calls `checkNativeNoteRecording + checkNoteRecordingService` from `specs/quint/refinement/native/note-recording.mjs and note-recording-service.mjs`) | Verdict: DELETE
- Covers: native recorder keeps segmented journal and restart state; recording service keeps the foreground owner. Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-20 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac, 2×300 s). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 9-19 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `NativeNoteRecording / NoteRecordingService` keeps running once through the native campaign list in the manifest runner.
