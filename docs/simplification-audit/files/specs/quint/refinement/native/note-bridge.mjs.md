# specs/quint/refinement/native/note-bridge.mjs
- Lines: 46 | Kind: Quint refinement driver (host JVM; compiles whole `AlphaVoiceCloudPlugin`, `AlphaNoteRecorder`, `AlphaNoteRecordingService`, `CloudVoiceLimit`, staged upstream `LocalVoiceRecording`/`CloudSpeechTimings`) | Verdict: KEEP; delete `probeNoteBridge`
- Covers: Notes recording permission flow: direct start, permission denied/granted/closed/paused, queued calls, resume after pause/retire/stop, start failure, second start, discard and retry. Model `NativeNotePermission`. Duplicates: none. Callers/importers: `native/index.mjs:19,188`; `test/quint-note-permission.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-28 | A7 | `probeNoteBridge` has no caller (`git grep probeNoteBridge` hits only its definition); it is the only user of `NoteBridgeSourceProbe.java`. | Delete the function and `NoteBridgeSourceProbe.java`. | None |
| 2 | 8-12 | C3 | Re-implements `nativePatchInputs` from `current-sources.mjs:30-32` and calls `preparePatchedNative()` at import time (a second time when `current-sources.mjs` is also loaded). | Import `nativePatchInputs` from `current-sources.mjs`. | None |
| 3 | 1-9 | D8 | Two `node:fs` imports, out of order. | Tidy. | None |
| 4 | 32-34 | B5 | Hashes harness/platform files as sources. | Trim. | None |

## Proposed end state
~30 lines: `sourceFiles`, `checkNotePermission`. Shares one module with `note-recording.mjs`/`note-recording-service.mjs` if those merge.
