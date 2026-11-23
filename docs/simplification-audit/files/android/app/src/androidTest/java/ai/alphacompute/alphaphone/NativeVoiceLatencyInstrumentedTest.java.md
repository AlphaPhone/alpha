# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NativeVoiceLatencyInstrumentedTest.java
- Lines: 320 | Role: issue #395 latency harness: live capture + VAD -> streaming ASR -> fixed reply -> Paradee TTS -> MediaPlayer/AudioTrack, recording last-speech-to-audible timing via upstream `VoiceLatencyProbe`. | Verdict: KEEP (owner question on home)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:299` (campaign); `scripts/native-voice-latency-emulator.ts` and `scripts/native-voice-latency.ts` (drive it and read `nativeVoiceLatencyExport`/`nativeVoiceLatencyReady` status keys); `test/native-voice-latency.test.mjs:148-149` reads this source and regex-matches `},"harness-no-inference",source,LiveVoiceCapture.detectors(VoiceAssets.sharedInference(app)));` (T1 source-text pin).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-15 | T5/D11 | A benchmark tool built only from upstream `ai.eliza.voice.*` classes; it is not a pass/fail product test, and lives among instrumentation tests. | Owner: keep here as the APK-level harness, or move it to the upstream voice module's androidTest. Default keep (the campaign scripts depend on it). | Low |
| 2 | 106-107, 135, 137-138, 157-161 | D8 | Fields assigned in the test method (`streamed=`, `warmOutput=`, `started=`, `out=`, `this.target=`) are declared after the method (L157-161); state split across instance fields and locals. | Move field declarations to the top; pass a small `Options` record instead of fields. | None |
| 3 | 212-217, 228 | B1 | `catch(Exception|Error failure)` / `catch(Exception ignored){busy.set(false);}` and `catch(Exception|Error ignored){/* the final export reports the run */}` — harness keeps running across failed turns by design. | Keep with comments. | - |
| 4 | 148-149 (test) | T1 | Host test pins one exact source line. | Delete that assertion when T1 source-text tests go; then this file can be reformatted. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `feedSource` | helper | 288-313 | none | keep |
| `decode(base64)` PCM16 | helper | 315-319 | PCM16 decoding in upstream `LiveVoiceCapture` (sink side) | keep |
| `REPLIES` | const | 76-80 | none | keep |

## Proposed end state
Same harness, fields declared up front; about 310 lines. Do not reformat line 134 until `test/native-voice-latency.test.mjs:148-149` is removed.

## Verification
`node scripts/native-voice-latency-emulator.ts --serial ... --wav ... --out ...` on an owned emulator; `node --test test/native-voice-latency.test.mjs`.
