# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LocalVoiceRecordingLimitInstrumentedTest.java
- Lines: 41 | Role: real microphone capture with a 29 s native deadline; decoded recording is near the limit and fits local ASR. | Verdict: KEEP (minor SIMPLIFY)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:296` (campaign); `scripts/test-native-permissions.ts:91-93` (`testClass`, gate `localVoiceRecording`); `test/android-instrumentation-runner.test.mjs:72,217`; `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28 | B4 | `try(BoundedActivityScenario<MainActivity> scenario=...launch(...))` — `scenario` is never used; the capture is constructed directly on upstream `ai.eliza.voice.LocalVoiceRecording`. | Drop the Activity launch unless foreground state is required for `RECORD_AUDIO` on the emulator (owner check: Android 14 requires a visible Activity or foreground service for mic capture — likely why it is there; then add a comment). | Low |
| 2 | 38 | B5 | Writes `local-speech-evidence/recording-limit.json`; nothing reads it (grep: 0 consumers). | Delete the evidence write. | Low |
| 3 | 26 | T5 | Exercises upstream `LocalVoiceRecording` with Alpha's prefix `"alpha-cloud-voice-"` only. | Keep as device acceptance of the deadline; consider upstreaming. | - |

## Local types and helpers
None beyond the inline `ContextWrapper` cache redirection.

## Proposed end state
Same test without the unread evidence file. About 36 lines.

## Verification
`node scripts/test-native-permissions.ts voice-limit APP.apk TEST.apk OUT` on an emulator with an injected microphone.
