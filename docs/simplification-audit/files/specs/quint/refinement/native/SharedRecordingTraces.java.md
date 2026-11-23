# specs/quint/refinement/native/SharedRecordingTraces.java
- Lines: 214 | Kind: Quint refinement harness of **staged upstream** code (patched `LocalSpeechBridgePlugin`, `SpeechRequestGate`, `LocalVoiceRecording`, worker executor) over `NoteBridgePorts` / `NoteRecordingPorts` | Verdict: KEEP, gated on upstream pin / patches; simplify the campaign runner
- Covers: draft (note) recording admission: permission prompt epochs, call/pause/resume/destroy while queued or active, two concurrent prompts, cancellation waiters, worker barrier, timeouts, refused worker queue, MediaRecorder release failure and retry. Duplicates: `NotePermissionTraces.java`, `LiveCaptureTraces.java`, `PipedCaptureTraces.java` reuse `NoteBridgePorts` for adjacent models (different properties); `SharedRecordingProbe.java` (dead) is a subset. Callers/importers: `shared-recording.mjs` (`checkSharedRecording`) <- `index.mjs`, `test/quint-shared-recording.test.mjs`.
- Model live: `specs/quint/native/SharedRecordingAdmission.qnt` (models patched upstream code: research §2.9 category).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 204-212 | C5 / P3 | `main(..., "campaign", ...)` spawns one child JVM per scenario (31) from inside Java via `ProcessBuilder`, duplicating what `java.mjs` `javaTraceCampaign` already does (one JVM per argument set). | Call `javaTraceCampaign('SharedRecordingTraces.java', compiled, scenarios.map(s=>[state, s]))` from the driver and delete the in-Java campaign branch. | low |
| 2 | 46-55 | T10 | `captured(lambda, type)` finds a queued task's captured `PluginCall` and `long` epoch by reflecting over **lambda synthetic fields**. Depends on javac's capture layout and on the closure capturing exactly one of each type. | Keep for now (upstream code); D14 follow-up: upstream exposes the queued epoch. | medium |
| 3 | 39-45, 73-75 | T10 | Reflection on bridge privates `gate`, `capture`, `epoch`, `workers`, `permissionEpochs`, `speechForeground`, `destroyed`, gate `waiters`, capture `id`, `recorder`, `interrupted`, `file`; private methods `microphonePermission`, `callStarted`. | Keep; upstream-only change surface. | low |
| 4 | driver `shared-recording.mjs:9-14` | C3 / C5 | Driver re-implements `currentNativeSource` and `nativePatchInputs` (already exported by `current-sources.mjs`) and calls `preparePatchedNative()` at import time. | Import both from `current-sources.mjs`. | low |
| 5 | 54-61 | — | Outcome mapping uses rejection strings (`"Recording cancelled"`, `"Voice cancellation is still draining"`, `"Microphone could not start"`) and codes. | Keep. | none |

## Proposed end state
Same 31 scenarios, launched by `javaTraceCampaign`; driver imports the shared source helpers; probe gone. Runs only when `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, the model or the note-bridge/recording ports change. Runtime today: one `javac` of ~20 files plus 31 child JVMs.
