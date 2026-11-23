# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNoteRecorder.java
- Lines: 346 | Role: process-wide singleton recorder for unlimited-length Notes recordings: gapless AAC segments via `MediaRecorder.setNextOutputFile`, a crash-safe `segments.json` journal, recovery after process death, owner/folder binding, and a remux join for saving. | Verdict: SIMPLIFY
- Importers: `AlphaVoiceCloudPlugin.java:97,132,139-142` (all Notes recording bridge methods), `AlphaNoteAudioPlugin.java:239-241` (`joined`, `totalMs`), `AlphaNoteRecordingService.java:55` (`status`). Text/path pins: `test/notes-recorder.test.mjs:312,533,539,607` (reads source; `assert.doesNotMatch(..., /\.readAllBytes\(/)`; JVM-runs it with `test/fixtures/NoteRecorderJournalTest.java` and stubs in `test/fixtures/note-recorder-jvm/`), `test/browser/journey-core-loops.production.spec.ts`, `test/support/feature-parity.mjs`, `specs/quint/native/NativeNoteRecording.qnt`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{NoteBridgeSourceProbe.java,NotePermissionTraces.java,NoteRecordingServiceTraces.java,NoteRecordingTraces.java,note-bridge*.mjs,note-recording*.mjs}`; androidTest `NoteRecorderInstrumentedTest`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 202-203, 213, 254 | C3 | Three copies of "stop the MediaRecorder ignoring the too-short race, then release": `try{active.stop();kept=true;}catch(RuntimeException tooShort){}active.release();`, `try{active.stop();}catch(RuntimeException ignored){}active.release();` ×2. | `private static boolean stopAndRelease(MediaRecorder r)` returning whether `stop()` succeeded; one documented catch. | none |
| 2 | 166, 200 | C3 | Duration expression `now-segmentStarted-pausedTotal-(pausedAt>0?now-pausedAt:0)` written twice (`currentMs()` and `finishCurrent`). `finishCurrent` nulls `recorder` first, so `currentMs()` returns 0 there. | Compute `long duration=Math.max(1,currentMs())` before `recorder=null` in `finishCurrent`. | Low; covered by `NoteRecorderJournalTest` durations. |
| 3 | 172, 190 | C3 | `if(usableSpace()<MIN_FREE_BYTES){state="stopped";stopReason="storage";publish();return;}` twice. | `private boolean stopIfLowStorage()`. | none |
| 4 | 84, 102 | C3 | `String.format(Locale.ROOT,"%05d.m4a",i)` twice (`segmentFile(i)` and inline in `recover` for another directory). | `segmentFile(File dir,int i)` static; reuse. | none |
| 5 | 120-128 | C3, P9 | `readJournal` bounded stream read (32 MiB) — twin of `AlphaLocalAgentPlugin.configureNativeViews` (16 KiB), `AlphaMapsTransportPlugin` (2 MiB) and 4 more (research P9). | Shared `BoundedIo.read(in, limit)`; keep the "API 29: no `readAllBytes`" constraint pinned by `notes-recorder.test.mjs:539`. | none |
| 6 | 55, 132 | C3 | `ID` UUID regex identical to `AlphaNoteAudioPlugin.OPERATION`; `validOwner` `[a-f0-9]{64}` is the 17×-repeated hex-digest regex. | `Ids.UUID_LOWER`, `Ids.isSha256Hex`. | none |
| 7 | 129, 130, 208, 286, 290 | B1 | Swallowed: `parseIndex` → -1 (fine), `usableSpace` → 0 (fine: stops recording), `writeJournal` failure in `finishCurrent` ignored (documented), `getMaxAmplitude` race (fine), `publish()` swallowing any listener `RuntimeException` (hides bridge bugs). | Keep the first four with one-line reasons; remove the catch in `publish()` or log the class. | low |
| 8 | 57-58 | D3 | Hand-rolled `static synchronized get(Context)` singleton (one of 7, research P2). | Fine for a process-wide recorder; optionally hold it in `AlphaApplication`. | — |
| 9 | 121 | D8 | `var bytes=` (only `var` in the file). | Consistency only. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ID` | const | 55 | `AlphaNoteAudioPlugin.OPERATION` | `Ids` util |
| `readJournal` | helper | 120-128 | bounded-read family (P9) | `BoundedIo` |
| `validOwner` | helper | 132 | 17× `[a-f0-9]{64}` | `Ids.isSha256Hex` |
| `deleteTree` | helper | 345 | check for other recursive deletes in main (e.g. `WorkflowWorkerAssets`) | `Files` util if a twin exists |
| `Listener`, `Segment` | interface/class | 59-60 | none | here |

## Proposed end state
~325 lines: one stop-and-release helper, one duration computation, one low-storage stop, shared ID/bounded-read helpers. Journal format (`segments.json` keys `d`, `t`, `ownerDigest`, `folderId`, `canonicalSavePending`), directory layout and segment naming unchanged byte-for-byte.

## Verification
`test/notes-recorder.test.mjs` (JVM run + source assertions), `NoteRecorderInstrumentedTest`, Quint note-recording refinements, `journey-core-loops.production.spec.ts`, Android build, and an emulator recording that crosses several segments and survives a process kill.
