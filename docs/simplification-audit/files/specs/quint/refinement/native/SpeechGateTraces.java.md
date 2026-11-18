# specs/quint/refinement/native/SpeechGateTraces.java
- Lines: 71 | Kind: Quint refinement harness of **staged upstream** code (`SpeechGate.java` from the patched `sense` module via `current-sources.mjs`) | Verdict: KEEP, gated on upstream pin / patches
- Covers: the listener's voice-activity gate: pre-roll ring wrap, minimum utterance, opening gap, mid-turn silence, max length and trim, reset while active, adaptive noise floor, level classes near threshold, invalid frames. Duplicates: none in this repo (upstream may have unit tests). Callers/importers: `speech-gate.mjs` (`checkSpeechGate`) <- `index.mjs`, `test/quint-speech-gate.test.mjs`.
- Model live: `specs/quint/native/NativeSpeechGate.qnt` (research §2.9 lists it as upstream-modelled in the consumer).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / §2.9 | Only upstream (patched) code is compiled; the result changes only with `upstream.lock.json`, `android/upstream-native-sources.json` or `patches/eliza/**`. | Path-filter the lane to those inputs plus the model; D14 follow-up to move upstream. | low |
| 2 | 28-34 | T10 | Reflection on `SpeechGate` privates `preroll`, `utterance`, `utteranceFrames`, `prerollCount`, `prerollNext`, `speechRun`, `speechFrames`, `silenceRun`, `active`. | Keep. | low |
| 3 | all | — | Clean: real class, no text slicing, no stubs, deterministic PCM markers. | none | none |

## Proposed end state
Unchanged; runs only on upstream/patch/model changes.
