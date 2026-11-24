# test/browser-local-transcription.test.mjs
- Lines: 76 | Kind: unit (T3; real `browser/local-transcription.ts` and upstream `.eliza/.../recording-pcm.ts` with stub agent and a fake `OfflineAudioContext`) | Verdict: DELETE (mostly duplicate); one case carried to `test/browser/journeys/voice.spec.ts`
- Covers: browser speech goes only to the explicitly selected local agent, discards work when selection changes or is aborted, encodes 16 kHz mono PCM WAV, and refuses recordings over size/duration before decoding. Duplicates: `test/browser/browser-speech.spec.ts` ("without a local agent, local speech is unavailable..."; "with a local agent, transcription sends a 16 kHz mono WAV to the agent") in real Chromium with a real `OfflineAudioContext`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13, 40-57 | T4 | Same behaviour as `browser-speech.spec.ts` (unavailable without agent; WAV header/format to the agent). The Playwright version uses the real audio stack. | Delete. | none |
| 2 | 26-38 | T3 | Replaces `globalThis.OfflineAudioContext` with a class whose `decodeAudioData` returns `{duration}`; the test checks clamp maths against its own fake. | Delete. | none |
| 3 | 4, 59-76 | T5 | `decodeRecordingPcm`/`recordingPcmWav` are upstream (`.eliza/client-features/packages/voice`). Size/duration admission is upstream behaviour. | Upstream follow-up. | low |
| 4 | 15-19 | — | Selection change during decode/provider response discards the result: not in the Playwright spec. | Carry one journey case: switch agent while a transcription is pending, no transcript is shown. | low |

## Proposed end state
Delete. `journeys/voice.spec.ts` (merging `browser-speech.spec.ts`) adds: "changing the selected local agent while a transcription is in flight shows no transcript and no error toast from the old agent".
