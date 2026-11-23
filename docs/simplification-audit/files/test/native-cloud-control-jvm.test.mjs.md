# test/native-cloud-control-jvm.test.mjs
- Lines: 125 | Kind: transplant (slices methods out of the staged upstream `SpeechStreamBridgePlugin.java` / `CloudSpeechWire.java` by brace counting and regex, embeds them in Java harness classes, runs on host JVM) + one Alpha slice (`AlphaVoiceCloudPlugin.limitOf`) + source-text (98-99, 122-124) | Verdict: DELETE
- Covers: Cloud speech permission/stop ownership, PCM feeder ordering and zeroisation, HTTP refusal bounds, relay renewal, provider-switch retirement, 429 retry facts. Duplicates: `native-cloud-permission-handoff.test.mjs` (permission/stop, same slicing), `test/cloud-speech-stream.test.mjs` (same `sharedSpeechSource` fragments). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-96, 107-121 | T2 / T5 | Upstream Java (`vendor/eliza/plugins/plugin-local-inference/.../speech-bridge`) cut by `indexOf` and regex (`FEED_TASKS`, `JSONObject hello=`), stubs in a template string. Upstream code; any upstream reformat breaks Alpha CI. | Delete; upstream follow-up (cross-file actions §6) to test in its own repo. | Medium |
| 2 | 97-105 | T2 | Slices Alpha's `limitOf`/`jsonText` from `AlphaVoiceCloudPlugin.java`. | Delete; 429 retry facts visible to the user are covered by voice journey (`cloud-voice-fixture.ts` rate-limit case) if present, else add one. | Medium |
| 3 | 122-124 | T1 | Regex over sliced `cleanup` body. | Delete. | None |
| 4 | 9 | P3 | `sharedSpeechSource` runs `preparePatchedNative` (stages patched native tree) at import. | Gone. | None |

## Proposed end state
File deleted. Voice ownership on device remains an instrumentation item; Alpha-side voice behaviour lives in `journeys/voice.spec.ts`.
