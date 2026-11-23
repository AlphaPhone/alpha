# scripts/test-batch-voice-progress-ack.ts
- Lines: 80 | Kind: unit (one factory, `speak`/`assertCurrent`/`captureRetired` stubbed) over the bundled real module | Verdict: MERGE into `test/voice-progress.test.ts`; delete shim `test/batch-voice-progress-ack.test.mjs`
- Covers: the voice "checking your calendar" acknowledgement speaks one model-provided label once, only for the bound turn/room/owner, after capture retirement, is preempted by the reply and cancelled by Stop. Duplicates: partial in `test/batch-ack-shell-retirement.test.mjs` (shell retirement); `test-batch-progress-stream.ts` (binding). Callers/importers: `test/batch-voice-progress-ack.test.mjs` (one-line import).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T3 | Stubbed unit test of a concurrency state machine. It is the only coverage of preemption/Stop/cleanup ordering, which a journey cannot time reliably; keep a reduced set. | Carry: early reply preempts queued cue (35); final aborts playing cue and waits cleanup (38); Stop cancels and late progress cannot restart (42); unconfirmed cleanup is rethrown (51); foreign turn/room/owner silent (25); capture-not-retired blocks, `null` claim plays (28-34); invalid/synthetic label silent (70-80, one parameterised case). Drop the duplicate "reply after cue" and mutation cases. | M |
| 2 | 57-68 | T4 | `batchProgressBinding`/`emitBatchProgress` cases repeat what the stream test proves end-to-end through `readLocalAgentStream`. | Drop; the stream cases cover binding. | L |
| 3 | 21-24 | D8 | Loop-generated test names via `JSON.stringify(patch)`, statement soup on one line. | One table-driven `test` with sub-cases. | L |

## Proposed end state
About 8 cases inside `test/voice-progress.test.ts` next to the stream parser cases; no separate file, no shim.
