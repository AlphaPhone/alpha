# specs/quint/refinement/native/on-device-recognizer.mjs
- Lines: 19 | Kind: Quint refinement driver (host JVM; staged upstream `OnDeviceRecognizer`, `RecognizerAvailability`, `RecognizerUnavailable`, `NativeAsr`, `VoiceNative` with upstream scripted Android recognizer fixtures) | Verdict: KEEP (absorbs `recognizerPlatformSources` from `recognizer-retirement.mjs`)
- Covers: On-device recognition sessions: incremental and early results, no-speech, language errors (active, duplicate, cancelled, after cancellation delivery), timeout, empty finish, cancel before open/after result, 64 s backlog boundary, stalled writer cancellation. Model `NativeOnDeviceRecognizer`. Duplicates: `recognizer-retirement.mjs` probe (see that report). Callers/importers: `native/index.mjs:34,191`, `test/quint-on-device-recognizer.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | — | Imports `recognizerPlatformSources` from `recognizer-retirement.mjs`; once that probe goes, the constant belongs here. | Move the two-line constant. | None |
| 2 | 9 | §2.9 | All compiled code is upstream `vendor/eliza` (shipped patched). It only changes on a pin bump or a patch edit. | Path-filter the lane to `upstream.lock.json`, `patches/eliza/**`, `android/upstream-native-sources.json`. | None |
| 3 | 7 | — | Platform sources come from an upstream test directory (`packages/app/scripts/paradee-voice/speech-pipeline`), including `OnDeviceRecognizerSessionTest.java`. Reusing upstream fixtures is preferable to local copies. | Keep. | — |
| 4 | 10 | B5 | Hashes harness files. | Trim. | None |

## Proposed end state
~18 lines with the platform-source constant inline; runs only on upstream/patch changes.
