# test/speech-output-warmup.test.mjs
- Lines: 38 | Kind: source-text (regexes the materialized upstream `LocalSpeechBridgePlugin.java`) + JVM run of upstream voice classes with Alpha fixtures (`SpeechOutputWarmupTest`, `SpeechLeadTrimTest`, `FirstWriteSpeechOutputTest`) | Verdict: MERGE JVM part into the host-JVM runner; DELETE regex part
- Covers: Speech-output warmup is admitted only when idle and closes on first audio, cancel, pause/destroy; lead-trim and first-write output behave. Duplicates: `test/streaming-speech.test.mjs` (same upstream voice sources), `cloud-speech-stream.test.mjs`, `live-voice.test.mjs`. Callers/importers: `npm test` glob only; `jvm-tools.mjs` (`runJvm`, `upstreamVoiceSource`, `fixture`), `scripts/prepare-patched-native.ts`, `scripts/upstream-native-source.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-31 | T1/T5 | Materializes the native source tree (no Alpha patches exist under `patches/eliza`) then regexes 11 exact statements of upstream bridge code. | Delete. | Low |
| 2 | 32-37 | T5 | All three JVM classes are upstream (`vendor/eliza/plugins/plugin-local-inference/.../voice`); the fixtures are Alpha-authored tests of upstream code. | Keep as JVM-runner rows now; upstream follow-up to move fixtures into `vendor/eliza` (D14). | Low |
| 3 | 15 | cost | Full native-source materialization for a regex check. | Gone with the regex part. | Low |

## Proposed end state
File deleted; three JVM-runner rows (sources + fixture + PASS line) remain until upstream owns these fixtures.
