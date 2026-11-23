# test/batch-progress-stream.test.mjs
- Lines: 1 | Kind: indirection (`import '../scripts/test-batch-progress-stream.ts';`) | Verdict: DELETE wrapper; MOVE its target into `test/integration/voice-progress.test.ts`
- Covers (via the 64-line target): the real `readLocalAgentStream` SSE parser emits a progress cue bound to turn, room and owner only for VOICE_DM streams, emits nothing on abort, keeps provisional tool tokens display-only, and marks settled direct text. Duplicates: `assistant-settlement-delivery.test.mjs` "batch progress callback is exact turn/room/owner-bound" (transplant, being deleted). Callers/importers: `npm test`; the target imports `scripts/fixtures/local-agent-stream.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | T9 | A one-line test whose real body lives under `scripts/` with a `test-` prefix. | Move `scripts/test-batch-progress-stream.ts` into `test/integration/voice-progress.test.ts` (merged with `test-batch-voice-progress-ack.ts`) and delete this file. | Low |
| 2 | target:5-6 | T9 | The target reads `ALPHA_ACK_HOST_ROOT` (no setter anywhere). | Drop the knob when moving. | — |
| 3 | target | — | The parser runs on real `Response` streams: it is the agent stream protocol boundary, so it is in scope for an integration file. Keep all five cases. | Carry. | — |

## Proposed end state
No wrapper. `test/integration/voice-progress.test.ts` holds the stream-parser cases and the acknowledgement cases, importing the real modules through `scripts/fixtures/local-agent-stream.ts` (moved to `test/support/`).
