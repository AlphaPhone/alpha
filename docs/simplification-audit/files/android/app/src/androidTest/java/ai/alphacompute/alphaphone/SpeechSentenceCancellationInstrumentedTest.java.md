# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SpeechSentenceCancellationInstrumentedTest.java
- Lines: 46 | Role: real-model check that `SessionSpeech.cancel()` interrupts native streaming TTS well before an uncancelled run finishes, and that the engine recovers. | Verdict: KEEP (owner question: move upstream)
- Importers: none. Registry `SpeechSentenceCancellation` (`scripts/android-instrumentation.ts:263`), CI `FUSED_SPEECH_CLASSES` (`scripts/ci/emulator-suite.ts:35`). Text/path pins: `test/ci-emulator-evidence.test.mjs:243` (registry args `{speechSentenceCancellation:'1'}`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5, 24-43 | T5 | Only upstream `ai.eliza.voice.SessionSpeech` / `VoiceAssets` are exercised; no Alpha class is involved. | Owner question: this belongs with the upstream voice package; keep here only while upstream has no emulator lane for its native engine. | Low. |
| 2 | 36 | T8 | `Thread.sleep(10)` re-cancel loop bounded by 120 s. | Keep (documented: a call may still be entering native code). | — |
| 3 | 44 | — | `finally` refuses to free native handles if the worker does not drain. | Keep (avoids use-after-free). | — |

## Local types and helpers
None besides the `TEXT` constant.

## Proposed end state
Unchanged (~46 lines), or deleted here once upstream runs the same test.

## Verification
CI fused-speech emulator lane (`scripts/ci/emulator-suite.ts`), `node --test test/ci-emulator-evidence.test.mjs`.
