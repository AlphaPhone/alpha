# test/pending-action-background-recovery.test.mjs
- Lines: 14 | Kind: transplant (slices `recoverPendingActions` out of `apps/app/src/prototype/agent-adapter.ts` between `  function recoverPendingActions(` and `  /** The stopped-reply`, `transformSync`, then `new Function` with eight injected names) | Verdict: DELETE
- Covers: a failed background pending-action read is quiet (no toast), latched and keeps existing cards; teardown or owner change suppresses the failure; explicit retry re-reads and re-enables the review; a changed context allows a new scoped read. Duplicates: Quint replay `specs/quint/refinement/application/pending-action-recovery.mjs` (run by `test/quint-pending-action-recovery.test.mjs`) drives the same function with scenarios `failedReadDoesNotPollTest`, `staleResultDroppedTest`, `blockedForgetsFailureTest`, `expiryReadsAgainOnceTest`; `test/browser/proposal-recovery.spec.ts` drives interrupted-reply recovery in the UI. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | T2 | Text-anchored slice of a 2.1k-line god module (D1); breaks on rename, split or reformat. | Delete. | Low |
| 2 | 9 | D8 | 1,500-character fixture line. | Gone. | None |
| 3 | 10-13 | T4 | Behaviour is the Quint PendingActionRecovery model's (quiet failure, latch, stale drop, re-read). | Rely on the Quint replay (which itself needs the PORT to an import, T10). | Low |

## Proposed end state
File deleted. Coverage of background recovery stays with the PendingActionRecovery Quint replay once its harness imports an exported `recoverPendingActions` instead of slicing; a UI-level check that a failed background read shows no toast belongs in `journeys/chat.spec.ts` next to `proposal-recovery.spec.ts`.
