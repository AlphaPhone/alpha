# test/batch-voice-progress-ack.test.mjs
- Lines: 1 | Kind: indirection (`import '../scripts/test-batch-voice-progress-ack.ts';`) | Verdict: DELETE wrapper; MERGE its target into `test/integration/voice-progress.test.ts`
- Covers (via the 80-line target): the spoken "thinking" acknowledgement speaks the model's label once, only for its own turn, room and owner, only after the mic is closed, is cancelled by the final reply, Stop or abort, and does not swallow a cleanup failure. Duplicates: `batch-ack-shell-retirement.test.mjs` (transplant, DELETE). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | T9 | One-line indirection to `scripts/test-*`. | Delete; move the target. | Low |
| 2 | target | T3 | The target is a unit test of `createBatchProgressAcknowledgment` with a fake `speak`. It is the only coverage of a timing-sensitive state machine (preemption, cleanup ordering) that a Playwright journey cannot drive deterministically, which is the T3 exception. | Keep about 10 cases: negative control, speak once, foreign turn/room/owner table, mic-not-retired, preempt by reply, final waits for cleanup, Stop cancels, unconfirmed cleanup rethrown, invalid label table, request binding table. Drop near duplicates (the two "named status without label" cases fold into one table). | Low |

## Proposed end state
No wrapper. The acknowledgement cases sit with the stream-parser cases in `test/integration/voice-progress.test.ts`.
