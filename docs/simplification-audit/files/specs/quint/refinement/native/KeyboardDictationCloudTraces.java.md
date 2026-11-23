# specs/quint/refinement/native/KeyboardDictationCloudTraces.java
- Lines: 99 | Kind: Quint refinement harness (unchanged `KeyboardDictationCloud`, `KeyboardDictationPolicy`, `CloudSpeechPolicy`, `CloudDeployment` on the JVM; credentials/authority/PCM/HTTPS as closed ports) | Verdict: KEEP
- Covers: IME dictation transcription route: Direct (Cartesia) vs Eliza Cloud, authority/provider/account change, password surface, credential expiry and cancel before the request or during the response, HTTP failure, malformed text, wrong provider header; recorded PCM zeroed afterwards. Duplicates: partly `test/keyboard-dictation.test.mjs` (javac/source-text of the same classes) and `test/cloud-voice-profile.test.mjs`. Callers/importers: `keyboard-dictation-cloud.mjs`, native aggregate, `test/quint-keyboard-dictation-cloud.test.mjs`.
- Model live: `KeyboardDictationCloud` (sources `KeyboardDictationCloud.java`, `KeyboardDictationPolicy.java`, `CloudSpeechPolicy.java`, `CloudDeployment.java`; all exist). Keyboard dictation ships in the launcher flavor.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 64-89 | — | `URL.setURLStreamHandlerFactory` asserts host (`api.cartesia.ai` / `CloudDeployment.PRODUCTION_API_HOST`), bearer token and no redirects, and serves synthetic replies. No real network or credentials: compliant with AGENTS.md. | Keep. | — |
| 2 | 17 | T10 | Reads private `connection` of `KeyboardDictationCloud`. | Keep; single name. | low |
| 3 | 10-15 | — | All state is static globals; one scenario per call, reset at the top of `scenario`. Acceptable for a single-threaded harness. | Keep. | — |
| 4 | — | T4 | `test/keyboard-dictation.test.mjs` + `test/fixtures/KeyboardDictationPolicyTest.java` cover the same policy as unit/source-text tests. | Delete those (tests-host chunk); this harness + `KeyboardDictationTraces` remain. | low |

## Proposed end state
Unchanged. Path filter: the four product classes, `keyboard-dictation-cloud-ports.mjs`, the model, this directory.
