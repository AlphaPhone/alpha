# specs/quint/native/NativeNotePermission.qnt
- Lines: 76 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness `note-bridge.mjs` compiles real `AlphaVoiceCloudPlugin`, `AlphaNoteRecorder`, `AlphaNoteRecordingService` (plus patched upstream `LocalVoiceRecording`, `CloudSpeechTimings`) against stub platform files | Verdict: KEEP
- Covers: Notes recording start/resume admission across microphone permission prompt, phone call, Activity pause/close: no capture is opened when the host is not live or a call is active (5 runs, 4 invariants). Duplicates: partly `NativeNoteRecording.qnt` (recorder resource state) and Playwright Notes recording journeys (renderer side only). Callers/importers: manifest; `specs/quint/refinement/native/note-bridge.mjs` (+`note-bridge-platform.mjs`, `NoteBridgeSourceProbe.java`, `NotePermissionTraces.java`); `test/quint-note-permission.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `note-bridge-platform.mjs:9-11` | T10 (stubs only) | Text `.replace` edits apply to the harness's own stub files (`android/content/Context.java`, `Handler.java`, `MediaRecorder.java`), not product source. Product classes compile whole. | None; optionally write the stubs in their final form instead of patching them. | None |
| 2 | `note-bridge.mjs:9-12` | C3 | Reads `android/upstream-native-sources.json` and calls `preparePatchedNative` itself; `voice-draft.mjs` repeats the same block. | Use `current-sources.mjs` (`currentNativeSource`, `nativePatchInputs`) as the speech harnesses do. | Low |
| 3 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |
| 4 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |

## Proposed end state
Model unchanged. Harness keeps compiling the real classes; shares the upstream-source helper; one runner; path-filtered to the three Alpha Java files and `LocalVoiceRecording`.
