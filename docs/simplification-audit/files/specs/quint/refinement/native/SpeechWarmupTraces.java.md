# specs/quint/refinement/native/SpeechWarmupTraces.java
- Lines: 83 | Kind: Quint refinement harness of **staged upstream** code (`SpeechOutputWarmup` on its real writer thread; output factory/port controlled; one stub `AudioTrackSpeechOutput` from `shared-recording-platform.mjs`) | Verdict: KEEP, gated on upstream pin / patches
- Covers: audio-output warm-up writes silence for at most 15 s, survives late open, open/play/write/abort/release faults, zero/negative write results, close during write, and always releases. Duplicates: none here. Callers/importers: `speech-warmup.mjs` (`checkSpeechWarmup`) <- `index.mjs`, `test/quint-speech-warmup.test.mjs`.
- Model live: `specs/quint/native/NativeSpeechWarmup.qnt`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32-39 | B1 | `hold(...)` loops swallowing `InterruptedException` and re-interrupts afterwards. Intentional: the port must stay blocked while the warm-up interrupts its writer. | Keep; add a one-line comment. | none |
| 2 | 41-46 | T10 | Reflection on `SpeechOutputWarmup` `writer`, `closed`, `output`. | Keep. | low |
| 3 | driver `speech-warmup.mjs:8-9` | C5 | Builds the whole shared-recording platform (several generated stubs) to take one file, `AudioTrackSpeechOutput.java`. | Export that one stub from the platform module (or a tiny `audio-output-platform.mjs`). | low |
| 4 | all | P6 | Upstream-only behaviour. | Path-filter to upstream/patch/model changes. | low |

## Proposed end state
Unchanged harness; lighter driver; scheduled only on upstream/patch/model change.
