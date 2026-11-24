# specs/quint/services/CalendarLinkedSync.qnt
- Lines: 128 | Kind: Quint model, live (14 tests, 5 invariants, 3 witnesses); **upstream-only sources** | Verdict: KEEP (upstream-pin lane); owner question Q-CAL-1
- Covers: the shared `LinkedCalendarReconciler` (read → analyse → stage → dispatch → provider result → pull/recovery) plus reviewed-controller admission (a review is bound to the owner epoch and the local revision). Properties: a dispatch only from a durable dirty mutation, a settled checkpoint means no pending operation, a review is owner-bound, and the state is bounded. Sources: all `vendor/eliza` (`contracts/src/calendar-linked-sync.ts`, `plugin-calendar/src/linked-sync/{sync-controller,linked-store,google-sync-port}.ts`). Imported by `specs/quint/native/ControllerComposition.qnt`. Callers: harness `refinement/services/calendar-linked.mjs` (129 lines), which `sourceModule`s the projected `.eliza/client-features/...` copies of those upstream files, a real import with no text slicing. Only the aggregate runs it, and there is no wrapper.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D4 check | D4 deletes the **renderer** client-side Calendar linked-sync stack. This worktree already deleted `runtime/calendar-linked-{provider,storage,store}.ts`, `calendar-sync-host.ts`, `native-calendar-sync.ts` and `browser/calendar-linked-local.ts`. This model's sources are upstream only, and its harness loads only upstream files, so it does **not** model deleted code and survives D4. | KEEP. Do not delete it with the renderer stack. | medium (easy to delete by association) |
| 2 | — | §2.9 | The model can only change on an upstream pin bump, yet it runs on every PR. | Select it only on `upstream.lock.json`/`vendor/eliza` pointer changes, or move it upstream (owner Q4). | low |
| 3 | — | coverage | Aggregate-only. | Per-model wrapper before deleting the aggregate. | high if the order is wrong |
| 4 | — | owner | Whether upstream linked sync is the accepted Calendar sync on the phone (D18/Q-CAL-1) decides if this stays in this repo. | Owner question. | owner |

## Proposed end state
Unchanged, in an upstream-pin lane, with its own wrapper. `ControllerComposition` keeps importing it.
