# specs/quint/refinement/native/voice-draft.mjs
- Lines: 32 | Kind: Quint refinement harness (Java, whole upstream class) | Verdict: KEEP (SIMPLIFY)
- Covers: model `NativeVoiceDraft` (live) — upstream `LocalVoiceRecording` limits, cancel, stale callbacks, stop/release failures, call interruption. Upstream-only. Duplicates: `test/quint-native-voice-draft.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-12,18 | C3 | Third copy of `preparePatchedNative()` + `nativePatchInputs` (also in `current-sources.mjs`, `shared-recording.mjs`, `note-bridge.mjs`), run at import time, with a cwd-relative `readFileSync('android/upstream-native-sources.json')`; the staged path is hard-coded instead of `currentNativeSource('LocalVoiceRecording.java')`. | Import `currentNativeSource`, `nativePatchInputs` from `current-sources.mjs`. | L |
| 2 | 32 | A7 | Unused CLI entry. | Delete. | L |
| 3 | – | P1 | Upstream-only. | Upstream-lock lane. | – |

## Proposed end state
~20 lines using `current-sources.mjs`; no import-time staging, no CLI.
