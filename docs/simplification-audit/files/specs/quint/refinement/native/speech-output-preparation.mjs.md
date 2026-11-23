# specs/quint/refinement/native/speech-output-preparation.mjs
- Lines: 26 | Kind: Quint refinement harness (Java, whole upstream classes) + regex constant extraction (T10) | Verdict: KEEP (SIMPLIFY)
- Covers: model `NativeSpeechOutputPreparation` (live) — `SpeechLeadTrim` and `FirstWriteSpeechOutput` (upstream) PCM lead trim and first-write reporting. Upstream-only. Duplicates: `test/quint-speech-output-preparation.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-18 | T10 | Regexes three upstream sources for constants: `LocalSpeechEngine` `\bSTREAM_RATE=(\d+);`, `VoiceLatencyProbe` `\bAUDIBLE_LEVEL=(\d+\.\d+)f;`, `LocalSpeechBridgePlugin` `new SpeechLeadTrim\(VoiceLatencyProbe\.AUDIBLE_LEVEL,LocalSpeechEngine\.STREAM_RATE\/(\d+)\)`. | Upstream follow-up: a `SpeechLeadTrim.forStream()` factory (or public constants) the harness can call; then compile `LocalSpeechEngine`/`VoiceLatencyProbe` constants or read them in Java. Until then keep the regexes (they pin upstream text at a reviewed lock). | L |
| 2 | 26 | A7 | Unused CLI entry. | Delete. | L |
| 3 | – | P1 | Upstream-only. | Upstream-lock lane. | – |

## Proposed end state
Same harness; constants obtained from code once upstream exposes them; no CLI.
