# specs/quint/refinement/native/RecognizerRetirementProbe.java
- Lines: 26 | Kind: JVM probe of upstream `OnDeviceRecognizer` (not a Quint replay; prints one JSON object per mode) | Verdict: DELETE
- Covers: after an answered or cancelled session a missing-language error keeps the language available; while active it demotes; one support probe per session. Duplicates: `OnDeviceRecognizerTraces.java` scenarios `duplicate-language-error` (answered then error), `cancelled-language-error` (cancel then error) and `active-language-error` (error while active) observe the same `demoted` field against the model, and its `observe()` already asserts exactly one support probe.
- Callers/importers: `recognizer-retirement.mjs:probeRecognizerRetirement`, called only by the second test in `test/quint-on-device-recognizer.test.mjs:15-19`. `recognizer-retirement.mjs` also exports `recognizerPlatformSources`, which `on-device-recognizer.mjs` imports.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4 | Duplicate of three model-checked scenarios; upstream-only code (T5). | Delete the file, `probeRecognizerRetirement`, and the second test in `test/quint-on-device-recognizer.test.mjs`. Move `recognizerPlatformSources` into `on-device-recognizer.mjs` and delete `recognizer-retirement.mjs`. | None |

## Proposed end state
Gone. The three behaviours stay covered by `NativeOnDeviceRecognizer` scenarios.
