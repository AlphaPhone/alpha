# specs/quint/refinement/application/google-calendar-disconnect.mjs
- Lines: 291 | Kind: Quint refinement harness; esbuild bundle of real `runtime/google-accounts.ts` with one comment-anchored observer seam | Verdict: KEEP (replace the comment anchor)
- Covers: `disconnectGoogleWithCalendar` starts Cloud privacy revoke without waiting for local cleanup, pauses Calendar only on an exact lease/source/revision match, ignores late or timed-out cleanup replies, refuses invalid UUID/budget/key and honours abort. Duplicates: run by `test/quint-google-calendar-disconnect.test.mjs` and aggregate `index.mjs:64` (T4). Callers/importers: those two.
- Model: `GoogleCalendarDisconnect.qnt`, live (source `runtime/google-accounts.ts`; production caller `googleCalendarDisconnectLifecycle` in `google-connection-ui.tsx`). Not part of the deleted client linked-sync stack (D4): it pauses the agent-side sync control.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 68-73 | T10 | Inserts `__observeCleanup(pause,retirement,pauseRequest);` before the **comment** `'    // Never await local cleanup before starting ordinary privacy revocation.'` (matches once). Rewording the comment breaks the formal suite; also couples to local names `pause`, `retirement`, `pauseRequest`. | Drop the intermediate `s.pause`/`s.retirement` observation and project from port calls, timers and the returned result (the model's final result already carries `calendarPause`/`callbackRetirement`); or, if mid-flight status must be observed, anchor on code, not a comment. | Med |
| 2 | 103-105 | – | Controlled `setTimeout`/`clearTimeout` passed as module globals: clean. | Keep. | – |
| 3 | 236-273 | – | 59 schedules generated from profile lists; cheap (pure Node). | Keep. | – |
| 4 | 286 | B5 | `batchSize: 22` tuning knob for the checker. | Keep only if `check-traces.mjs` still needs batching. | Low |

## Proposed end state
Same campaign, no comment anchor, one runner. Lane: `google-accounts.ts`, `agent-calendar.ts` (types), model.
