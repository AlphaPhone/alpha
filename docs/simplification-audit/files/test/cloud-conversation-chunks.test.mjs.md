# test/cloud-conversation-chunks.test.mjs
- Lines: 39 | Kind: transplant (`test/fixtures/cloud-voice-view.mjs` vm-transplants the voice views; `shared-batch-voice.mjs` fake clock) | Verdict: DELETE; merge into the voice integration/journey
- Covers: Cloud voice conversation waits for the final reply, speaks a short first piece then the rest, never resends the turn; Stop between pieces requests no more speech. Duplicates: `test/browser/cloud-tts-streaming.spec.ts`, `voice-stop-speaking.spec.ts`; about 40 other host files on the same fixture (research "voice view family"). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4 | T2 | Built on the vm voice-view transplant family slated for replacement by one voice integration. | Delete. | None |
| 2 | 10 | T3 | Patches `f.box.React`/`VoiceActivity` inside the sandbox. | Gone. | None |
| 3 | 15-39 | T4 | First-piece-then-rest and Stop-between-pieces are what `cloud-tts-streaming.spec.ts` and `voice-stop-speaking.spec.ts` assert in a browser. | Confirm both cases are in `journeys/voice.spec.ts`; add "no speech request before the final reply" if missing. | Low |

## Proposed end state
Deleted with the voice-view transplant family; chunked Cloud speech is a `journeys/voice.spec.ts` step.
