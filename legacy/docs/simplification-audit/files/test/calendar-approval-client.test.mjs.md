# test/calendar-approval-client.test.mjs
- Lines: 53 | Kind: unit (real `CalendarApprovalClient` and `calendar-approval.ts`, stub request port) | Verdict: MERGE into `test/integration/calendar.test.ts`
- Covers: a Calendar approval decision is sent once with the reviewed revision; a lost reply, a second tap, a mutated admitted row, owner change, expiry or abort never re-dispatch; receipts must match request and decision. Duplicates: `test/quint-calendar-approval-review.test.mjs` and `test/quint-approval-decision.test.mjs` (same single-dispatch/owner-fence properties as model replays), `test/browser/calendar-approval-queue.spec.ts` (UI path). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-27 | T4 | Single dispatch, lost reply and concurrent tap are the subject of the approval Quint replays. | Keep only if the replay does not drive `CalendarApprovalClient` itself; check the harness imports. | Low |
| 2 | 28-32 | T3 | Six object mutations of an admitted row (identity freeze). Real risk (reviewed request cannot change), cheap. | Carry as one table case. | None |
| 3 | 37-41 | - | Late read/decision after owner change cannot publish. | Carry. | None |
| 4 | 48-53 | T3 | Receipt parser table (`parseCalendarApprovalResolution`). Trust-boundary parser. | Carry as one table case. | None |
| 5 | 9 | C1 | Hand-built session port object type repeats the shape used in other approval tests. | Use the shared fake from the integration harness. | None |

## Proposed end state
Three cases in `test/integration/calendar.test.ts` ("approval decision dispatches once per admitted read",
"admitted request is frozen", "receipts must match request and decision") on one shared owner-session fake. Drop
whatever the Quint approval replay already drives through this class.
