# test/fixtures/SpeechLeadTrimTest.java
- Lines: 23 | Kind: unit (upstream class `ai.eliza.voice.SpeechLeadTrim`) | Verdict: DELETE
- Covers: synthesized lead-in silence trimming with a short pre-roll. Duplicates: byte-identical to `vendor/eliza/plugins/plugin-local-inference/native/android/test/speech/SpeechLeadTrimTest.java` (`diff` shows no difference), which upstream runs from `test/speech-output.node.mjs`. Callers/importers: only `test/speech-output-warmup.test.mjs:36`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-23 | T4, T5 | Verbatim copy of an upstream test of upstream code. | Delete; drop line 36 of the importer. | None |

## Proposed end state
Deleted. Upstream owns the class and its test.
