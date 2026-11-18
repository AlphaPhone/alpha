# specs/quint/refinement/native/shared-recording.mjs
- Lines: 50 | Kind: Quint refinement harness (Java, whole upstream classes) | Verdict: KEEP (SIMPLIFY)
- Covers: model `SharedRecordingAdmission` (live) — draft recording admission, permission epochs, call/pause/destroy interruptions and cancellation barrier in the **upstream** `LocalSpeechBridgePlugin`, `SpeechRequestGate`, `LocalVoiceRecording`. No Alpha product source is compiled (upstream-only model). Duplicates: `test/quint-shared-recording.test.mjs` (T4). Callers/importers: `index.mjs`, `live-capture.mjs` (imports `currentNativeSource`, `nativePatchInputs`, `sharedRecordingSources`), that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-13 | C3 | Re-defines `currentNativeSource` and `nativePatchInputs`, which `current-sources.mjs` already exports, with a **different** resolver (hard-coded `speech-bridge/` vs `src/main/` paths). `live-capture.mjs` imports the local copy. Two resolvers for one job. | Delete the local copies; import from `current-sources.mjs` (make it resolve `LocalSpeechBridgePlugin` correctly) in this file and `live-capture.mjs`. | M |
| 2 | 10-11 | B1/bug | `preparePatchedNative()` runs at **import** time, and `readFileSync('android/upstream-native-sources.json')` is relative to the process cwd (fails if tests run from another directory). With 0 patches, `nativePatchInputs` is just two files plus the receipt. | Lazy, root-relative; or drop with the patch staging. | L |
| 3 | 22-26 | A7 | `probeSharedRecording` and `SharedRecordingProbe.java` have no caller (grep: only this definition). | Delete both. | L |
| 4 | 1,8 | – | `readFileSync` imported in a second `node:fs` import line. | Merge imports. | L |
| 5 | – | P1 | Upstream-only model. | Lane: `upstream.lock.json`, this folder's recording files; not Alpha `android/**`. | – |

## Proposed end state
~35 lines: `sharedRecordingSources` + `checkSharedRecording` using `current-sources.mjs`; no import-time staging, no
dead probe. Listed in the native README as an upstream-only model (follow-up candidate to move upstream, D14).
