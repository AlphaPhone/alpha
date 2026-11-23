# test/fixtures/CloudSpeechTimingsTest.java
- Lines: 51 | Kind: Java fixture, unit of upstream `ai.eliza.voice.CloudSpeechTimings` (speech-bridge, staged unmodified) | Verdict: DELETE (with `test/cloud-speech-timing.test.mjs`; upstream follow-up)
- Covers: monotonic stage marks, network/playback phase durations, Server-Timing redaction, first terminal outcome wins, 100-row history, duration bound. Duplicates: none here. Callers/importers: `test/cloud-speech-timing.test.mjs:5` (6-line wrapper).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T5 | Imports `ai.eliza.voice.CloudSpeechTimings`; `android/upstream-native-sources.json` lists no patches, so this is upstream code. | Upstream owns this test. | Low |
| 2 | importer | T9 | A 6-line node wrapper only spawns javac. | Goes with it. | Low |

## Proposed end state
Fixture and wrapper deleted; upstream follow-up "CloudSpeechTimings host test". Alpha's diagnostics export journey
covers that timings appear without secrets.
