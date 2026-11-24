# specs/quint/refinement/native/recognizer-retirement.mjs
- Lines: 12 | Kind: host-JVM probe of upstream recognizer code (not a model replay) + shared platform-source constant | Verdict: DELETE (move `recognizerPlatformSources` into `on-device-recognizer.mjs`)
- Covers: Runs `RecognizerRetirementProbe.java` for `answered`, `cancelled`, `active` and returns rows that test 2 of `test/quint-on-device-recognizer.test.mjs` compares (availability kept after a retired error, demoted after an active missing-language error). Duplicates: `onDeviceRecognizerScenarios` `active-language-error`, `cancelled-language-error`, `cancel-before-callback-delivery`, `duplicate-language-error` replay the same retirement/demotion behaviour against the model. Callers/importers: `native/on-device-recognizer.mjs:5` (constant only), `test/quint-on-device-recognizer.test.mjs:4` (probe).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | T3/T5 | A unit probe of upstream `OnDeviceRecognizer` outside the model; its cases are already model-checked scenarios. | Delete `probeRecognizerRetirement`, `RecognizerRetirementProbe.java`, and test 2 of `test/quint-on-device-recognizer.test.mjs`. | Low |
| 2 | 5-7 | — | `recognizerPlatformSources` is the only live export. | Move to `on-device-recognizer.mjs`. | None |
| 3 | 12 | A7 | CLI entry. | Gone with the file. | None |

## Proposed end state
File removed; `README.md:220` sentence about it removed.
