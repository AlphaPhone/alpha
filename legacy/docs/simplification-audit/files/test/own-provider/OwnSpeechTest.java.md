# test/own-provider/OwnSpeechTest.java
- Lines: 43 | Kind: Java fixture, unit of upstream `ai.eliza.voice.CartesiaSpeech` (`vendor/eliza/plugins/plugin-local-inference/native/android/speech-bridge`) with a fake `HttpURLConnection` | Verdict: DELETE
- Covers: fixed Cartesia STT/TTS endpoints, request body/headers (`Cartesia-Version: 2026-03-01`, `sonic-3.5`, 24 kHz WAV), errors never leak the key, cancellation before open and mid-read, 256 KiB response bound. Duplicates: upstream `vendor/eliza/plugins/plugin-native-agent/test/connection/OwnerProviderTest.java` imports `CartesiaSpeech` and `connection.node.mjs:82` compiles it ("fixed speech transport"). Callers/importers: only `test/own-provider.test.mjs:11-14`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-43 | T5 / T4 | Tests upstream transport code; upstream compiles and tests the same class. | Delete with test 2 of `own-provider.test.mjs`. | Low |
| 2 | 30-36 | T1-like | Pins the vendor wire contract (model id, version header, body field count); a vendor bump legitimately changes these and fails Alpha's suite. | Belongs upstream if anywhere. | Low |

## Proposed end state
File deleted (and the `test/own-provider/` directory with it once `own-provider.test.mjs` tests 1-3 go). Any case missing upstream (response size bound, mid-read cancel) is an upstream follow-up (D14).
