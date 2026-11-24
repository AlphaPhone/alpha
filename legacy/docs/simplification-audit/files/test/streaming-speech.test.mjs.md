# test/streaming-speech.test.mjs
- Lines: 72 | Kind: JVM run of an upstream fixture (`upstreamVoiceFixture("StreamingSpeechTest.java")` from `vendor/eliza`) + source-text over upstream Java (`LocalSpeechBridgePlugin`, `AudioTrackSpeechOutput`, `SessionSpeech`, `SpeechAudioFocus`, `LiveVoiceCapture`) | Verdict: MERGE test 1 into the host-JVM runner (upstream follow-up); DELETE tests 2-3
- Covers: Streamed on-device speech: bounded PCM queue, cancellation, focus policy, AudioTrack streaming and call refusal. Duplicates: `speech-output-warmup.test.mjs` (same upstream sources); upstream plugin-local-inference suites. Callers/importers: `npm test` glob only; `jvm-tools.mjs` (`runJvm`, `upstreamBridgeSource`, `upstreamVoiceFixture`, `upstreamVoiceSource`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-17 | T5 | Runs upstream's own host-JVM fixture against upstream sources: no Alpha code involved. | JVM-runner row now; delete when upstream CI runs it (D14). | Low |
| 2 | 19-72 | T1/T5 | ~40 regexes over upstream Java after stripping comments; any upstream refactor breaks Alpha's suite. | Delete. | Low |

## Proposed end state
File deleted; one JVM-runner row tagged upstream follow-up.
