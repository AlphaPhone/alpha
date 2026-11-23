# test/agent-calendar-refresh-state.test.mjs
- Lines: 248 | Kind: transplant (whole `runtime/agent-calendar.ts` with imports stripped and run through `new Function`; `canonicalHomeCalendar` sliced from `agent-calendar-view.ts`) plus a real `ServiceReadCache` import | Verdict: REWRITE as `test/integration/agent-calendar.test.ts` (real import), carrying a subset; then the Quint replay remains the exhaustive check
- Covers: Agent Calendar refresh state: stale/unverified next event never shown as verified, coalescing behind a mutation, trailing same-window reads, retirement, saved-feed restore and 401/403 invalidation. Duplicates: `test/quint-agent-calendar-refresh.test.mjs` (25 traces, 237 checkpoints, same controller), Calendar Playwright specs for loading states. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-13 | T2 | Strips every import and `export` from the product file and evaluates it with three thrown stubs; any new import breaks it. | Import the module with tsx (it imports only types and two `.eliza` helpers). | Low |
| 2 | 17, 23, 46-47, 57, 135 | A1 | Every fixture passes a `CalendarPreservation` port as the second constructor argument. The in-flight A1 change deleted that parameter (`constructor(port, client, cache, …)`), so the "client factory" is now the preservation object: the file is broken against the working tree. | Drop the argument in the rewrite. | High until fixed |
| 3 | 177-178 | A1 | "legacy review hides saved rows" case tests the deleted transition-required/legacy-recovery states. | Delete that case. | None |
| 4 | 26-120 | T4 | Next-event freshness, coalescing and retirement rules are what the `agent-calendar-refresh` Quint model replays. | Keep at most 4 representative cases (failed next read keeps cached but unverified; mutation coalescing; identical refresh queues one trailing read; foreign event refused). | Low |
| 5 | 126-248 | - | Saved-feed restore and 401/403 invalidation use the real `ServiceReadCache`: this part is genuine integration and not modelled in Quint (check). | Keep: reload shows saved rows read-only; 403 hides and invalidates saved rows; late local read cannot override a refusal; bootstrap never publishes after owner change. | Medium if dropped |
| 6 | 142-145 | B5/T8 | `settleLocal` polls with 1 ms timers up to 5 s. | Await the controller's own promise instead. | Low |

## Proposed end state
`test/integration/agent-calendar.test.ts` imports `AgentCalendar` and `ServiceReadCache` directly, uses one synthetic API
port and an in-memory cache store, and keeps about eight cases: four refresh-state cases from finding 4 and four
saved-feed cases from finding 5. The `agent-calendar-refresh` Quint replay remains the exhaustive state-space check.
