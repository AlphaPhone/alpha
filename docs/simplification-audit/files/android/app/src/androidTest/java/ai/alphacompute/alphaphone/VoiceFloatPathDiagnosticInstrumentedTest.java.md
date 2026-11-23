# android/app/src/androidTest/java/ai/alphacompute/alphaphone/VoiceFloatPathDiagnosticInstrumentedTest.java
- Lines: 77 | Role: One-off "release-05 root-cause" diagnostic comparing float vs saved-PCM ASR inputs for the on-device speech round trip; writes evidence files and asserts only that it ran. | Verdict: DELETE
- Importers: none. Listed in `scripts/android-instrumentation.ts:342` `NOT_RUN_BY_A_RUNNER` ("root-cause diagnostic ... explicitly not acceptance evidence"). Text/path pins: only that `NOT_RUN_BY_A_RUNNER` entry, which `test/android-instrumentation-runner.test.mjs` cross-checks against the class list (the entry must be removed in the same change). No specs/quint, feature-parity or LemmaScript pins.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-77 | A7 / T5 | No runner executes it; it is a historical investigation tool: "release-05 root-cause evidence ... this test asserts only that the evidence was produced, never a keyword". | Delete the file and the `VoiceFloatPathDiagnostic` key in `NOT_RUN_BY_A_RUNNER`. | None: never executed; `LocalSpeechInstrumentedTest` remains the acceptance test. |
| 2 | 31-36 | C3 | `linear16k` "copied exactly" from the canonical resampler (a copy of production logic in a test). | Goes with the delete. | — |
| 3 | 20-27, 75 | B5 | Evidence ceremony: writes `float-path-diagnostic.json` that nothing reads (grep `float-path-diagnostic`: 0 hits outside this file). | Goes with the delete. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `linear16k` | helper | 32-36 | production resampler in upstream speech engine (`LocalSpeechEngine`) | delete |
| `wavSamples`, `writeFloats`, `transcribe`, `recognized` | helper | 38-51 | `recognized` keyword check resembles `LocalSpeechInstrumentedTest` | delete |

## Proposed end state
File deleted (0 lines); `NOT_RUN_BY_A_RUNNER` loses one entry.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (class registry/reachability check) and an androidTest compile (`npm run android:build:local` builds the test APK).
