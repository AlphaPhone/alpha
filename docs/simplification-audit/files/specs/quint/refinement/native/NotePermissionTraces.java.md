# specs/quint/refinement/native/NotePermissionTraces.java
- Lines: 133 | Kind: Quint refinement harness (whole `AlphaVoiceCloudPlugin`, `AlphaNoteRecorder`, `AlphaNoteRecordingService`, `CloudVoiceLimit` and staged upstream `LocalVoiceRecording`/`CloudSpeechTimings` compiled against generated ports) | Verdict: KEEP (simplify runner)
- Covers: live model `specs/quint/native/NativeNotePermission.qnt`: Notes recording start/resume through microphone permission prompt, active phone call, host pause/close, queued main-thread start, recorder start failure, second start, discard-and-retry, resume after stop/failure/retire. 22 scenarios. Duplicates: host `test/notes-recorder.test.mjs` regex-checks parts of the same bridge (T1, slated for deletion); `NoteBridgeSourceProbe` (DELETE) is a subset. Runs twice: `test/quint-note-permission.test.mjs` and the aggregate (`index.mjs:188`).
- Callers/importers: `note-bridge.mjs` (`checkNotePermission`).

## How it is tied to product code
- Whole-file compile, no text slicing in this file. `note-bridge-platform.mjs` string-patches generated stub sources only (its own fixtures).
- Reflection: private method `AlphaVoiceCloudPlugin.noteMicrophonePermission(PluginCall)` (67), private fields `noteForeground`, `closed` (34, 73). `plugin.fixtureDestroy()` is a stub-`Plugin` method.
- Compile closure includes the whole `AlphaVoiceCloudPlugin` (paired/cloud speech included); the product's planned simplification of that plugin (Q-HOST-1 paired speech) changes the stub set, not this harness.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 121-132 | C5 | Hand-written "campaign" mode re-spawns the JVM per scenario; identical blocks in `NoteRecordingTraces`, `NoteRecordingServiceTraces`, `PipedCaptureTraces`. `java.mjs:javaTraceCampaign` already compiles once and runs each argument set in a fresh JVM. | Delete the `campaign` branch; `note-bridge.mjs` calls `javaTraceCampaign('NotePermissionTraces.java', compiled, scenarios.map(s=>[state,s]))`. | Low |
| 2 | 67, 34 | T10 (reflection) | Private method/field names pinned. | Keep; name them in the header comment. | Low |
| 3 | campaign | T4 | Per-model test plus aggregate. | One runner. | None |

## Proposed end state
Keep all 22 scenarios. Drop the in-Java campaign launcher in favour of `javaTraceCampaign`. Use the merged
single-queue ports class (see `NoteBridgePorts.java.md`). Run from the native family runner only.
