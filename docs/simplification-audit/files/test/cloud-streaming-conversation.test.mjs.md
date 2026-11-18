# test/cloud-streaming-conversation.test.mjs
- Lines: 173 | Kind: source transplant (upstream `.eliza/client-features/packages/voice/src/voice-assistant-session.ts` read as text, exports removed, types stripped and run in the `vm` box of `fixtures/cloud-voice-view.mjs`, which itself assembles the voice adapter from source) with a fake clock | Verdict: REWRITE as `journeys/voice.spec.ts` cases
- Covers: Cloud Talk streams endpointed speech without batch STT; joins a continuation that starts 230 ms after a final; Stop inside the window sends nothing; a refused streaming start before audio falls to on-device speech, never a batch clip, and routes the next turn to the device; non-network failures are not retried elsewhere; without on-device speech a streaming refusal shows the same timeline as the batch route; a playback failure mid-reply keeps the reply and reports nothing heard; the on-device fallback shows no stale error; input held during a reply is shown as automatically muted. Duplicates: `test/browser/cloud-tts-streaming.spec.ts`, `chat-voice-mode.spec.ts`, `voice-assistant.production.spec.ts`; `test/voice-calm-cloud-errors.test.mjs` and other `cloud-voice-view.mjs` importers (10 files). Callers/importers: `npm test` glob; imports `support/strip-types.mjs`, `fixtures/cloud-voice-view.mjs`, `fixtures/shared-batch-voice.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-15 | T2 / T5 | Transplants upstream session code into a fake scope; Alpha's adapter and upstream session meet only through the box. | Delete. | Medium |
| 2 | 9 | A7 | `buildVoiceTurnSignal` is imported (a `tsImport` round trip) and then replaced by `f.box.buildVoiceTurnSignal=()=>({})` at 18; the import is unused. | Goes with the file. | None |
| 3 | 110-130 | - | Streaming vs batch timeline parity for 401/402/429/503 is a useful contract. | Carry into the journey as a parameterised case. | Low |
| 4 | 11-27 | T7 | Hand-written speech fake per file; `cloud-voice-fixture.ts` and `generic-cloud-speech-fixture.ts` already exist for Playwright. | Use the Playwright fixture. | None |

## Proposed end state
Deleted. `journeys/voice.spec.ts` (dev build, streaming speech fake with a page clock) carries: endpointed turn sends once after 400 ms; continuation joined; Stop in window sends nothing; refused start -> on-device with no batch upload; non-network failure shows error; refusal copy equal on both routes; partial playback failure keeps reply and shows the notice; held input shows "Microphone paused while Alpha responds".
