# test/fixtures/NoteRecorderJournalTest.java
- Lines: 73 | Kind: Java fixture, integration (real `AlphaNoteRecorder` over stub `Context`, `MediaRecorder`, `SystemClock`, `JSObject` from `test/fixtures/note-recorder-jvm`; real files in a temp directory; process death simulated by resetting the singleton) | Verdict: KEEP, MOVE to the Gradle JVM notes suite
- Covers: a recording survives process death as paused with its finished segments, durations, journaled transcript and owner/folder binding; the partial segment is dropped; resume continues; an uncertain canonical save stays reserved; torn journals, missing segments and unrelated directories keep their bytes and block a new recording. Duplicates: device `NoteRecorderInstrumentedTest` (real MediaRecorder, does not kill the process mid-segment). Callers/importers: `test/notes-recorder.test.mjs:607` (last case of a 608-line file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-20 | D7 | Resets the private static `instance` by reflection to simulate a new process. | Acceptable in a test; better, give `AlphaNoteRecorder` a package-private factory for tests in the same package (Gradle test source set allows it). | Low |
| 2 | all | ok | Data-loss rules (keep bytes when uncertain) have no other host coverage. | Carry every case. | High if deleted |
| 3 | importer | P6 | Uses its own stub tree `note-recorder-jvm`. | Fold the stubs into the shared Android stub set (or use Robolectric/Gradle's android.jar stubs). | Low |

## Proposed end state
Gradle `NoteRecorderJournalTest`, same scenarios, shared stubs. The `runJvm` line in `notes-recorder.test.mjs` removed.
