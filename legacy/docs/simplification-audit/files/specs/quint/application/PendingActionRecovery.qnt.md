# specs/quint/application/PendingActionRecovery.qnt
- Lines: 91 | Kind: Quint model (live; slicing harness) | Verdict: KEEP + PORT harness
- Covers: Recovery of pending reviewed actions: one read per binding, results applied only to their binding, a failed read is remembered not retried, expiry timer re-reads once. Duplicates: none known. Callers/importers: manifest row (agent-adapter.ts, connection-ui.tsx; 8 symbol pins); harness specs/quint/refinement/application/pending-action-recovery.mjs; wrapper test/quint-pending-action-recovery.test.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | pending-action-recovery.mjs:24-29 | T2/T10 | `compile()` slices agent-adapter.ts between `'  function proposalCard('` and `'  p.cancelReadReplyCompletions=function'`, and between `'  function recoverPendingActions('` and `'  /** The stopped-reply'`, then evals with `new Function`. | PORT: move `recoverPendingActions` + `proposalCard` into their own module (agent-adapter split, D1) exporting `createPendingActionRecovery(shellPorts)`; harness imports it. | M |
| 2 | manifest symbols | T10 | Pins `pendingActionExpiryTimer`, `scheduleExpiry` etc. inside agent-adapter.ts. | Drop after PORT. | L |
| 3 | model | - | Clear, small, live. | Keep. | L |

## Proposed end state
Model unchanged; harness imports an extracted recovery module; agent-adapter.ts free of text anchors for this feature.
