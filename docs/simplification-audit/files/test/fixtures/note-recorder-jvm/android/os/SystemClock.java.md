# test/fixtures/note-recorder-jvm/android/os/SystemClock.java
- Lines: 2 | Kind: fixture (host-JVM Android framework stub) | Verdict: KEEP (lives and dies with the AlphaNoteRecorder host-JVM case)
- Covers: Mutable static `now` returned by elapsedRealtime(); the test advances it to give segments durations. Duplicates: same-named stubs with different behaviour in `test/fixtures/app-update-jvm/` and `test/fixtures/reviewed-copies-jvm/` (see chunk summary; not merged). Callers/importers: only `test/notes-recorder.test.mjs:606` (list of 13 stubs passed to `runJvm` with `android/.../AlphaNoteRecorder.java` and `test/fixtures/NoteRecorderJournalTest.java`); no other reference in apps, android, scripts, specs, .github.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 | The set is only meaningful together with `NoteRecorderJournalTest.java`, which runs the real `AlphaNoteRecorder.java` on a host JVM. When `test/notes-recorder.test.mjs` is deleted/rewritten (mostly source-text and stub-driver cases), the JVM case must move, not vanish: it is the only PR-time coverage of torn-journal, missing-segment and canonical-save-pending recovery. | Move the JVM case to its own `test/integration/notes-recorder-journal.test.mjs` (or the Notes integration file) and keep the stub tree beside it. | Low |

## Proposed end state
Unchanged file, still listed by the single JVM integration case for `AlphaNoteRecorder`. If the owner instead moves the torn-journal / missing-segment / pending-save cases into `android/app/src/androidTest/.../NoteRecorderInstrumentedTest.java` (which already covers crash recovery and `canonicalSavePending` on device), the whole `note-recorder-jvm/` tree and `NoteRecorderJournalTest.java` are deleted together.
