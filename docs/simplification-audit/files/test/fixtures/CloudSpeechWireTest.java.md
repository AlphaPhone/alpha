# test/fixtures/CloudSpeechWireTest.java
- Lines: 24 | Kind: Java fixture, unit of upstream `ai.eliza.voice.CloudSpeechWire` (package `ai.eliza.voice`) | Verdict: DELETE (upstream follow-up)
- Covers: downlink PCM frame decoding and bounds, ownership copy, phrase splitting that preserves text, relay renewal bounds, the extend header constants. Duplicates: none here. Callers/importers: `test/cloud-speech-stream.test.mjs:16` (one case of a 191-line file; the rest of that file is reviewed in its own report).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | T5 | The fixture sits in the upstream package and tests only upstream code. | Upstream owns it. | Low |
| 2 | 20 | T1 | Asserts two string constants. | Goes with the file. | Low |

## Proposed end state
Fixture and the `runJvm` line in `cloud-speech-stream.test.mjs` deleted; upstream follow-up "CloudSpeechWire host test".
