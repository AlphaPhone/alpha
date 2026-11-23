# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LocalSpeechInstrumentedTest.java
- Lines: 81 | Role: packaged CPU speech models offline: human recording transcribes, synthesis round-trips through ASR, close/reopen stable; the model holder reuses and releases sessions on its worker. | Verdict: KEEP (minor SIMPLIFY)
- Importers: none. Text/path pins: `scripts/ci/speech-candidate.ts:32` (`CANONICAL_TEST` = this path); `test/ci-emulator-evidence.test.mjs:245` asserts the source contains `"1".equals(InstrumentationRegistry.getArguments().getString("localSpeech"))` (T1); `scripts/android-instrumentation.ts:258`; `scripts/ci/emulator-suite.ts:35`; comment in `VoiceFloatPathDiagnosticInstrumentedTest.java:21`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-28, 51-52, 63, 74-77 | B5 | Writes `local-speech-evidence/result.json`, `synthesized.wav`, `name-and-number.wav`, `holder-result.json` to external files; no script or test reads that folder (grep `local-speech-evidence` over scripts/test/.github: 0 hits; `speech-candidate.ts` writes its own `result.json` from the instrumentation log). | Delete the evidence JSON writes; keep the WAV writes only if a person listens to them (owner). | Low |
| 2 | 30, 34, 49, 58 | B4 | `VoiceAssets.Bundle models=VoiceAssets.install(app)` assigned and unused; then `VoiceAssets.install(app)` is called again at L34, L49 and L61. | Install once and use `models.openInference()`. | Low |
| 3 | 30-48 | D8 | Mis-indented body inside `try` (L30-48 at the outer level). | Reformat when touched. | None |
| 4 | 3-5 | T5 | Exercises upstream `SessionSpeech`/`LocalSpeechEngine`/`VoiceAssets` only; acceptable as APK packaging acceptance. | Keep. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| fixture WAV load | helper | 31, 59 | `LiveVoiceVadInstrumentedTest.java:33` | `SpeechFixture.human()` |
| inline linear resampler | helper | 40 | none in Alpha | keep inline |

## Proposed end state
Same two methods, single model install, no unread evidence JSON. About 65 lines. Keep the `localSpeech` gate string verbatim until `test/ci-emulator-evidence.test.mjs:245` is deleted (T1).

## Verification
`node scripts/ci/speech-candidate.ts` / emulator fused-speech suite with staged voice outputs and networking disabled; `node --test test/ci-emulator-evidence.test.mjs`.
