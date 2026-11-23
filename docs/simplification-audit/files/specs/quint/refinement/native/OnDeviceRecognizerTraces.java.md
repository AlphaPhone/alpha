# specs/quint/refinement/native/OnDeviceRecognizerTraces.java
- Lines: 150 | Kind: Quint refinement harness (upstream `OnDeviceRecognizer`, `RecognizerAvailability`, `RecognizerUnavailable`, `NativeAsr`, `VoiceNative` with upstream scripted Android recognizer fixtures) | Verdict: KEEP (upstream-only model: run only when `upstream.lock.json` / native source manifest changes)
- Covers: live model `specs/quint/native/NativeOnDeviceRecognizer.qnt`: on-device speech recognition session: incremental feed, first-answer authority, no-speech, missing-language error demotes only while active, cancel before/after/pending, callback delivered after cancel request (held main queue), 64 s backlog boundary with a stalled writer, timeout. 15 scenarios. Duplicates: `RecognizerRetirementProbe.java` (DELETE) re-checks three of these. Runs in `test/quint-on-device-recognizer.test.mjs` and the aggregate (`index.mjs:191`).
- Callers/importers: `on-device-recognizer.mjs` (`checkOnDeviceRecognizer`).

## How it is tied to product code
- All compiled sources are `vendor/eliza/plugins/plugin-local-inference/...` resolved through `current-sources.mjs` (`preparePatchedNative`); `android/upstream-native-sources.json` currently lists **no patches**, so this is unmodified upstream code shipped in the APK.
- Depends on upstream test fixtures `vendor/eliza/packages/app/scripts/paradee-voice/speech-pipeline/OnDeviceRecognizerSessionTest.java` and its `android-api/` stubs (`listening`, `released`, `waitFor`, `pcm`, `heard`, `Finishing`).
- Reflection on private fields `pipe`, `audio`, `recognizer`, `released`, `finished`, `stopped`, `text`, `failure`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / §2.9 | Models upstream-only code; it can change only on a submodule bump yet runs on every PR. | Path-filter the lane to `upstream.lock.json`, `android/upstream-native-sources.json`, the model and this directory; long term move upstream (D14 follow-up). | None |
| 2 | 20, 64-68 | coupling | Imports an upstream *test* class (`OnDeviceRecognizerSessionTest`) from a scripts folder; an upstream reorganisation breaks it. | Note in the follow-up list; nothing to change here. | Low |
| 3 | 52 | — | `observe()` asserts exactly one support probe per session; this subsumes `RecognizerRetirementProbe`'s `supportProbes` check. | None. | None |
| 4 | campaign | T4 | Per-model test plus aggregate. | One runner. | None |

## Proposed end state
Unchanged harness; runs once, in an upstream-change lane. Absorbs the retirement probe's assertions (already
covered by `duplicate-language-error`, `cancelled-language-error`, `active-language-error`).
