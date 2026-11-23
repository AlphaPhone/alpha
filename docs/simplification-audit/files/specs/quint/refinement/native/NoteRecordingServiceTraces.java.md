# specs/quint/refinement/native/NoteRecordingServiceTraces.java
- Lines: 113 | Kind: Quint refinement harness (whole `AlphaNoteRecorder` + `AlphaNoteRecordingService` + real Capacitor `JSObject`) | Verdict: KEEP (simplify runner)
- Covers: live model `specs/quint/native/NativeNoteRecordingService.qnt`: foreground-service ownership of the current recording id: stale start/stop/toggle for a retired recording, blank commands, discard, service recreation, pause/resume toggles, foreground refusal, `stopServiceWhen` fallback (no unowned `Context.stopService`), same-id stop/resume races. 17 scenarios. Duplicates: `test/notes-recorder.test.mjs:543-548` regex-reads the service source (T1, DELETE). Runs in `test/quint-native-recording.test.mjs` and the aggregate (`index.mjs:188`).
- Callers/importers: `note-recording-service.mjs` (`checkNoteRecordingService`).

## How it is tied to product code
- Whole-file compile; no text slicing. Public/package API used: `AlphaNoteRecordingService.start`, `recordingClosed`, `onStartCommand`, `onDestroy`, `ACTION_PAUSE`, `ACTION_RESUME`, `EXTRA_RECORDING`; recorder `start/stop/resume/discard/owns/status`. Reflection on service fields `foreground`, `foregroundRecording`; stub `Service` fields `shown`, `stopped`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 102-112 | C5 | Same per-scenario JVM launcher as three sibling harnesses. | Use `javaTraceCampaign` from `note-recording-service.mjs`. | Low |
| 2 | 54, 73, 76, 84, 87 | — | In-harness `AssertionError`s check safety outside the model (unowned `stopService`, live recording hidden). They are real behaviour checks on the product. | Keep. | None |
| 3 | campaign | T4 | Per-model test plus aggregate. | One runner. | None |

## Proposed end state
Unchanged scenarios and observation. Runner uses `javaTraceCampaign`; executed once from the native family runner.
