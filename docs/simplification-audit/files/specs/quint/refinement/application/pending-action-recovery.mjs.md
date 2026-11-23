# specs/quint/refinement/application/pending-action-recovery.mjs
- Lines: 88 | Kind: Quint scenario/witness/random replay; anchor slice of `agent-adapter.ts` (T2/T10) | Verdict: PORT
- Covers: background recovery of pending action proposals (`recoverPendingActions` + `proposalCard` in `apps/app/src/prototype/agent-adapter.ts`, live at lines 298-393): one read per binding, failed read does not poll, stale results dropped on rebind, expiry re-reads once, blocked connection forgets failure. Model `PendingActionRecovery.qnt`.
- Duplicates: `test/pending-action-background-recovery.test.mjs` covers the same function (T4; review it in the host-test chunk). Callers: `test/quint-pending-action-recovery.test.mjs` only (not in the application aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-29 | T2/T10 | Slices `  function proposalCard(` … `  p.cancelReadReplyCompletions=function` and `  function recoverPendingActions(` … `  /** The stopped-reply`, then `new Function` with 8 injected free variables (47-50). Anchors exist today but any edit of the comment at line 393 breaks it. | Extract `recoverPendingActions` and `proposalCard` from `agent-adapter.ts` (D1 split) into `prototype/pending-action-recovery.ts`, taking `connectionController`, `alphaClient`, timers and clock as a deps object. Harness imports it with `loadProductModule`. | Medium: tied to the agent-adapter split. |
| 2 | 15 | C5 | Second replay engine (`assistant-model-traces.mjs`). | Merged helper. | Low. |

## Proposed end state
Imported module with explicit deps; keep the 89 traces; keep only one of this harness and `pending-action-background-recovery.test.mjs`.
