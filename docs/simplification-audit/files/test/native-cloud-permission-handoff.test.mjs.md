# test/native-cloud-permission-handoff.test.mjs
- Lines: 53 | Kind: transplant (slices `startCloudSpeech`, `microphoneReady`, `start` prefix, `stopCloudSpeech`, `owned`, `handleOnDestroy` prefix from the staged upstream `SpeechStreamBridgePlugin.java`; host JVM) | Verdict: DELETE
- Covers: microphone-permission startup and Stop transfer pending ownership atomically without holding the monitor across authority lookup. Duplicates: `native-cloud-control-jvm.test.mjs` test 1 (same methods, same cases minus threading). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-10 | T2 / T10-like | Cuts at literal `'  submit(control,'` and `'if(own!=null)'`; `ALPHA_SPEECH_HANDOFF_SOURCE` env knob nothing sets (T9). | Delete. | Medium |
| 2 | 15-50 | T5 | Concurrency proof of upstream code with a hand-written Capacitor/Handler world. | Upstream follow-up. | Medium |

## Proposed end state
File deleted; listed as an upstream test follow-up for `plugin-local-inference` speech-bridge.
