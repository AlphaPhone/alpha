# specs/quint/refinement/application/google-calendar-link-flow.mjs
- Lines: 317 | Kind: Quint refinement harness; esbuild bundle of real `runtime/google-accounts.ts` with three text seams | Verdict: KEEP (remove the three seams)
- Covers: `linkGoogleCalendar` waits for Calendar to settle, keeps a saved destination or picks the unique approved primary, derives a stable operation key, re-reviews before resume, never confirms sync on a lost reply, reports conflicts with current titles. Duplicates: run by `test/quint-google-calendar-link-flow.test.mjs` and aggregate `index.mjs:63` (T4). Callers/importers: those two.
- Model: `GoogleCalendarLinkFlow.qnt`, live (sources `runtime/google-accounts.ts`, `runtime/agent-calendar.ts`). Production path: `google-connection-ui.tsx:299`. Uses the agent-side `changeSync` (the live path per D4), not the deleted client stack.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 75-92 | T10 | Three inserts into `google-accounts.ts`: after `" let sent=false,revision:number\|undefined,latest:AgentCalendarSyncReview\|undefined,dispatch:string\|undefined;"` (exact spacing and type annotations), after `'  for(let step=0;step<3;step++){'`, after the `linkOperationKey(...)` line. All match once today; the planned Prettier pass (D9) breaks all three. | Observe through ports instead: `latest` = the `captured` argument of `changeSync` and `result.review`; `sent`/`dispatch` = the `sending` callback and `pendingDispatch` in the next review; `phase` = which port is held; the operation-key hash check moves into `changeSync(…, key, …)` (already receives `key`). Then delete `compile`'s plugin. | Med |
| 2 | 104-109 | – | Wraps `crypto.subtle.digest` to await pending digests before observing; needed and fine. | Keep. | – |
| 3 | 15-36 | – | Message-text → class map; couples to UI copy. | Acceptable. | Low |
| 4 | 249-299 | – | 42 schedules, pure Node; cheap. | Keep. | – |

## Proposed end state
Plain bundle of `google-accounts.ts`, observation from port arguments and the result, same 42 schedules. Survives formatting
and refactors of `linkGoogleCalendar`. One runner. Lane: `google-accounts.ts`, `agent-calendar.ts`, model.
