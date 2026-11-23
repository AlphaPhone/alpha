# specs/quint/refinement/native/NoteRecordingTraces.java
- Lines: 142 | Kind: Quint refinement harness (whole `AlphaNoteRecorder` with real temp-file journal; MediaRecorder/timers are ports) | Verdict: KEEP (simplify runner; one scenario conditional on D1)
- Covers: live model `specs/quint/native/NativeNoteRecording.qnt`: segmented Notes recording: pause accounting, 27 s rollover, `setNextOutputFile` callbacks, journal-write failures at start/rollover/text, recovery after restart, corrupt journal and missing segment block recovery and refuse a replacement capture, stale recorder callbacks, foreign id, join failure, short stop. 18 scenarios. Duplicates: `test/notes-recorder.test.mjs:312-607` JVM-runs `test/fixtures/NoteRecorderJournalTest.java` against the same recorder (journal recovery, `readAllBytes` regex) — host javac unit/integration test plus T1 regexes. Runs in `test/quint-native-recording.test.mjs` and the aggregate.
- Callers/importers: `note-recording.mjs` (`checkNativeNoteRecording`).

## How it is tied to product code
- Whole-file compile. Reflection on private recorder state: `recorder`, `dir`, `index`, `segmentStarted`, `pausedAt`, `pausedTotal`, `rollover`, `recoveryUnavailable`, and the private `AlphaNoteRecorder(Context)` constructor (67). Journal format pinned as data: `segments.json` keys `segments[].d`, `segments[].t`, `ownerDigest`, `folderId`; segment names `%05d.m4a`, `joined.m4a` (these are G5 persisted formats, so pinning them is correct).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 120-122 | A1 | Scenario `legacy-binding` removes `ownerDigest`/`folderId` from a journal and restarts (`legacyRestart`, model test `legacyAudioRetainsNoOwnerTest`). Current code always writes both keys (`AlphaNoteRecorder:297`), so an unbound journal comes only from an older build. D1 deletes such readers, but the recorder branch (`validOwner(...)?recordedOwner:null`, line 107-110) also handles a corrupt owner. | If the product report's simplification removes the unbound-journal branch (treat missing/invalid owner as unrecoverable), delete this scenario, `legacyRestart` and `legacyAudioRetainsNoOwnerTest` in the same change. Otherwise keep and rename to `unbound-journal`. Owner question. | Medium: recovery behaviour for a corrupt owner changes. |
| 2 | 131-141 | C5 | Per-scenario JVM launcher duplicated in three siblings. | `javaTraceCampaign` from `note-recording.mjs`. | Low |
| 3 | 24-47 | T10 (reflection) | Eight private field names plus private constructor pinned. Product report (SIMPLIFY) may rename/merge these when consolidating stop/duration helpers. | Keep; list fields in a header comment; update together with the product cleanup. | Low |
| 4 | 28, 33 | D8 | Dense one-line loops. | Split when touched. | None |

## Proposed end state
Keep 17 scenarios (18 if the unbound-journal branch stays, renamed). Runner via `javaTraceCampaign`, once, from the
native family runner. This harness plus `NoteRecordingServiceTraces` becomes the only JVM coverage of the recorder
once `test/notes-recorder.test.mjs`'s source-text parts go; its JVM journal case can be dropped as duplicate.
