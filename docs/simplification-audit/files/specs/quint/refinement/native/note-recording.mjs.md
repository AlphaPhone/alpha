# specs/quint/refinement/native/note-recording.mjs
- Lines: 27 | Kind: Quint refinement driver (host JVM; whole `AlphaNoteRecorder`) | Verdict: KEEP (absorbs `note-recording-service.mjs`)
- Covers: Segmented Notes recording: pause, rollover, recovery after restart, journal failures at start/rollover/text, join failure, open failure, short stop, capture error, stale callbacks, wrong id, corrupt journal, missing segment, unbound journal, text-edit failure. Model `NativeNoteRecording`. Duplicates: none. Callers/importers: `native/index.mjs:16,187`, `test/quint-native-recording.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | A1 (question) | Scenario `legacy-binding` strips `ownerDigest`/`folderId` from the journal and restarts (model action `legacyRestart`, test `legacyAudioRetainsNoOwnerTest`). `AlphaNoteRecorder.java:107-110` treats a journal without a valid binding as ownerless. If that path exists only for journals written by builds before bindings (D1: no such installs), delete the scenario, the model action and test together with the product branch; if it is the malformed-journal guard, rename the scenario and action `unboundRestart`. | Owner/implementer decision with the Android chunk owning `AlphaNoteRecorder`. | Low |
| 2 | 1-27 | C5 | Near-identical to `note-recording-service.mjs`. | Merge (see that report). | None |
| 3 | 15 | B5 | Hashes harness files. | Trim. | None |

## Proposed end state
One `note-recording.mjs` with `checkNativeNoteRecording` and `checkNoteRecordingService` on a shared runner, ~35 lines.
