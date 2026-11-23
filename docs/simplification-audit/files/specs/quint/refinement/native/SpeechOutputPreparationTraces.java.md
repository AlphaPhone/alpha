# specs/quint/refinement/native/SpeechOutputPreparationTraces.java
- Lines: 121 | Kind: Quint refinement harness of **staged upstream** code (`SpeechLeadTrim`, `FirstWriteSpeechOutput`, playback output interface) | Verdict: KEEP, gated on upstream pin / patches; driver stops regex-reading constants
- Covers: reply audio preparation: leading-silence trim with a bounded pre-roll at the exact audible threshold (adjacent floats, NaN, infinities), array identity and zeroing, and the "first audio" report firing once before the first output write even when the report or the write throws; transport delegation. Duplicates: none here. Callers/importers: `speech-output-preparation.mjs` (`checkSpeechOutputPreparation`) <- `index.mjs`, `test/quint-speech-output-preparation.test.mjs`.
- Model live: `specs/quint/native/NativeSpeechOutputPreparation.qnt`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver `speech-output-preparation.mjs:12-16` | T10 | Driver regex-reads `STREAM_RATE=(\d+);` from `LocalSpeechEngine.java`, `AUDIBLE_LEVEL=(\d+\.\d+)f;` from `VoiceLatencyProbe.java`, and the divisor from the literal `new SpeechLeadTrim(VoiceLatencyProbe.AUDIBLE_LEVEL,LocalSpeechEngine.STREAM_RATE/(\d+))` in `LocalSpeechBridgePlugin.java`, then passes them as CLI args. | Compile `LocalSpeechEngine`/`VoiceLatencyProbe` (or read the staged constants with `javap`-free reflection inside the harness: `VoiceLatencyProbe.AUDIBLE_LEVEL`, `LocalSpeechEngine.STREAM_RATE`); ask upstream to expose the bridge's lead-trim factory so the divisor is not a text match. | low |
| 2 | test | B5 | Asserts a trace starts with production lead `727`. Exact constant pin. | Drop; the `production-lead` scenario already uses the derived value. | low |
| 3 | 74-75 | T10 | Reflection on `SpeechLeadTrim` `preRoll`, `level`, `open`, `held`; wrapper `first`. | Keep. | low |
| 4 | all | P6 | Upstream-only behaviour. | Path-filter to upstream/patch/model changes. | low |

## Proposed end state
Same 13 scenarios; constants obtained from compiled classes, not regexes; scheduled only on upstream/patch/model change.
