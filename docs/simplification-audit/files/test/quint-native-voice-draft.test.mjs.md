# test/quint-native-voice-draft.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper (calls `checkVoiceDraft` from `specs/quint/refinement/native/voice-draft.mjs`) | Verdict: DELETE
- Covers: shared native voice draft callbacks, selection and failed-start cleanup. Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac, 300 s). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-10 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `NativeVoiceDraft` keeps running once through the native campaign list in the manifest runner.
