# test/native-live-pcm.test.mjs
- Lines: 17 | Kind: host-JVM runs: two of upstream `ai.eliza.voice` classes with upstream fixtures, one of Alpha's `NativeVoiceBinding` + `VoiceEventAdmission` with committed `test/fixtures/NativeVoiceBindingTest.java` | Verdict: DELETE tests 1-2; MERGE test 3 into `test/integration/android-jvm.test.mjs`
- Covers: Alpha's voice enrollment binding refuses re-enrollment, stale epoch, owner/runtime change and expiry (test 3); upstream PCM pipe bounds and IPC deadlines (tests 1-2). Duplicates: `native-voice-event-worker.test.mjs` test 2 (same `VoiceEventAdmission.current` rules); Quint `specs/quint/refinement/native/resident-coordinator.mjs` replays VoiceEventAdmission. Callers/importers: `npm test` glob; `test/fixtures/jvm-tools.mjs`; sole importer of `NativeVoiceBindingTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-13 | T5 | Runs upstream `LiveSegmentPipe`/`BufferedStreamExchange` fixtures from `vendor/eliza`. | Delete; upstream owns them (D14 follow-up). | Low |
| 2 | 15-17 | - | Real product classes, committed fixture, deterministic. | Keep in the android-jvm suite next to the VoiceEventAdmission case. | None |

## Proposed end state
File deleted. `test/integration/android-jvm.test.mjs` runs `NativeVoiceBindingTest` (and the VoiceEventAdmission
table from native-voice-event-worker) once, through `jvm-tools.mjs`.
