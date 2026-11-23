# test/calendar-agent-review.test.mjs
- Lines: 63 | Kind: unit (real import of `apps/app/src/browser/calendar-agent-review.ts`, pure function, no stubs) | Verdict: MERGE into `test/integration/calendar.test.ts`
- Covers: the text of the agent Calendar review (create/update/delete/share) in the event's zone, including DST overlap/gap and all-day dates independent of device zone. Duplicates: `test/browser/calendar-agent-all-day-review.spec.ts` (rendered all-day review), `test/browser/calendar-availability.spec.ts` (share review). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-18, 34-38 | T3/T4 | Line-by-line copy checks of the review ("No invites sent", "names not shared"). Copy is what the Playwright review journey sees. | Drop from host; assert one review's visible text in `journeys/calendar.spec.ts`. | Low |
| 2 | 39-57 | T3 | DST overlap/gap and all-day across far zones (Kiritimati/Pago Pago) are the risky part and hard to reach from a browser with one `timezoneId`. | Carry into the calendar integration file as table cases. | None |
| 3 | 58-63 | T3 | `wholeUtcDates` is a three-line predicate tested alone. | Fold into the all-day case (an update with non-whole dates is refused) or drop. | Low |
| 4 | 59 | - | Second dynamic import of the same module inside a test. | Use the top-level import. | None |

## Proposed end state
File removed. `test/integration/calendar.test.ts` gets two cases: "review times show the event zone offset at each
instant across DST" and "all-day review dates ignore device and proposal zone". Copy of the review is asserted once in
`journeys/calendar.spec.ts` (agent proposal review).
