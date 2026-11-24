# test/batch-ack-shell-retirement.test.mjs
- Lines: 43 | Kind: transplant (`test/fixtures/cloud-voice-view.mjs` evals `voice-adapter.ts` text read at line 9; `adapterSourceTransform`) with a fake clock | Verdict: DELETE
- Covers: on web and Android, pressing Stop while the spoken "thinking" acknowledgement plays keeps the microphone closed until native playback cleanup settles; a cleanup failure shows a media error and blocks restart. Duplicates: `scripts/test-batch-voice-progress-ack.ts` covers the same acknowledgement lifecycle on the real `createBatchProgressAcknowledgment` ("Stop cancels playing acknowledgement", "unconfirmed cleanup is not swallowed"). Callers/importers: `npm test`; `cloud-voice-view.mjs` (18 importers) and `shared-batch-voice.mjs` (9 importers) survive through other tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T9 | `ALPHA_ACK_HOST_ROOT` and `ALPHA_ACK_VIEW_SOURCE` swap in another checkout's fixtures and adapter source; grep finds no setter (only `scripts/test-batch-progress-stream.ts` reads the first). | Gone with the file. | — |
| 2 | 9, 16 | T2 | Reads `voice-adapter.ts` as text and hands it to the fixture, which evaluates it with React stubbed to `createElement:()=>null`. | Delete. | — |
| 3 | 25-43 | — | The research table marked this "A: source-text"; it is a transplant (C). The behaviour is safety-relevant (the mic must not reopen during cleanup). | Carry one case to `journeys/voice.spec.ts` with the voice bridge fake: "Stop during an acknowledgement does not reopen the mic until playback stops; a failed stop shows an error". | Med |

## Proposed end state
File deleted. One voice journey case; the acknowledgement lifecycle's unit-level edge cases stay in the voice integration file built from `scripts/test-batch-voice-progress-ack.ts`.
