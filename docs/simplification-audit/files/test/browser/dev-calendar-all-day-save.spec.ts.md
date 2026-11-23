# test/browser/dev-calendar-all-day-save.spec.ts
- Lines: 22 | Kind: module-in-page (P1/P7) with a short UI tail, chromium dev build | Verdict: **DELETE**
- Covers: the browser `AlphaCalendar` stand-in stores all-day and daily all-day events as exact UTC civil-day boundaries, reopens them after reload and shows them in the month view on the right day; invalid all-day inputs are rejected without writing. Duplicates: `calendar-wide-days.spec.ts`, `canonical-calendar-form-review.spec.ts` (all-day display in the product Calendar). Callers/importers: none. 3 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-17, 21 | P7 / T6 | `cal.save`/`cal.list` return values of `apps/app/src/browser/calendar.ts`; input validation of a stand-in. | Delete. | Low. |
| 2 | 18 | P2 | `registerPlugin('AlphaCalendar').open({id})` to navigate. | — | none |
| 3 | 7-12 | — | Month-view navigation to a day is a real UI step, already covered by `calendar-month-focus.spec.ts`. | — | none |

## Proposed end state
File removed; all-day display stays covered by the canonical Calendar journey.
