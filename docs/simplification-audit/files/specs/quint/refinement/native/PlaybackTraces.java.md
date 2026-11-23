# specs/quint/refinement/native/PlaybackTraces.java
- Lines: 80 | Kind: Quint refinement harness (upstream `StreamingSpeechPlayback` with real queue/writer; output and listener are ports) | Verdict: KEEP (upstream-only model lane)
- Covers: live model `specs/quint/native/StreamingPlayback.qnt` (native manifest; sources are all `vendor/eliza/...speech-bridge`): streaming TTS playback completion, partial writes, output open failure, write failure, stop while opening, buffer zeroing and exactly one terminal callback. 5 modes. Duplicates: none in this repo.
- Callers/importers: `refinement/native/index.mjs:80` `extraGroups` (with `StreamingSpeechPlayback`, `SpeechPcmQueue`, `SpeechAudioFocusPolicy`, `VoiceLatencyTrials` from `voice`), run only via the aggregate `test/quint-native-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / §2.9 | Upstream-only behaviour. | Upstream-change lane; upstream follow-up (D14). | None |
| 2 | 1 | D11 | Declared in `ai.alphacompute.alphaphone` although it drives only `ai.eliza.voice` classes. Harmless (public API only) but misleading. | Leave unless the harness moves upstream. | None |
| 3 | 32 | T10 (reflection) | Private fields `started`, `terminal`. | Keep. | Low |

## Proposed end state
Unchanged; executed once from the native family runner in the upstream-change lane.
