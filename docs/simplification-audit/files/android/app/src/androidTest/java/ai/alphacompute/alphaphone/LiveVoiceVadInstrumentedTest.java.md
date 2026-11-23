# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LiveVoiceVadInstrumentedTest.java
- Lines: 47 | Role: Silero VAD through the packaged bundle in the app process: silence opens no segment, recorded speech opens and closes one. | Verdict: KEEP
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:262` (arg `localSpeech`); `scripts/ci/emulator-suite.ts:35` (`FUSED_SPEECH_CLASSES`); `test/ci-emulator-evidence.test.mjs:241-243` (asserts the registry args of the fused speech classes); asset `androidTest/assets/speech-fixture/0.wav`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-7 | T5 | Every class exercised is upstream (`ai.eliza.voice.*`); the Alpha-specific part is that the APK packages the bundle and JNI bridge. That is packaging acceptance, so keep. | Keep. | - |
| 2 | 33 | C3 | `speech-fixture/0.wav` load + `readMono16kWav` repeated in `LocalSpeechInstrumentedTest.java:31,59`. | Small `SpeechFixture.human()` helper if these classes are touched. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `segments(vad,pcm)` | helper | 38-46 | none | keep |

## Proposed end state
Unchanged. 47 lines.

## Verification
`scripts/ci/emulator-suite.ts` fused-speech suite (`-e localSpeech 1`) on an APK with staged voice outputs.
