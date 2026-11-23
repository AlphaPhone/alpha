# test/fixtures/FirstWriteSpeechOutputTest.java
- Lines: 25 | Kind: Java fixture, unit of upstream `ai.eliza.voice.FirstWriteSpeechOutput` (package `ai.eliza.voice`) | Verdict: DELETE (upstream follow-up)
- Covers: the first-audio callback fires once, before the first blocking write, and other calls delegate. Duplicates: none here. Callers/importers: `test/speech-output-warmup.test.mjs:37`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T5 | Upstream class, upstream package, no Alpha patch. | Upstream owns it. | Low |

## Proposed end state
Fixture and its `runJvm` line in `speech-output-warmup.test.mjs` deleted; upstream follow-up.
