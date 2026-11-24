# test/calendar-recurrence.test.mjs
- Lines: 30 | Kind: unit (real `browser/calendar-recurrence.ts` `expandCalendarSeries`, pure) | Verdict: MERGE into `test/integration/calendar.test.ts`
- Covers: daily/weekday/weekly/all-day recurrence keeps its saved zone across DST gaps/overlaps, half-hour and quarter-hour zones, seeks old series to the range and reports truncation without mutating storage. Importer of the module: `browser/calendar-records.ts` (browser Calendar store). Duplicates: last case of `test/calendar-view-rules.test.mjs` (skipped-date, via vm transplant); `test/browser/dev-calendar-series.spec.ts` (UI). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 | Pure algorithm with real DST risk that a browser test with one `timezoneId` covers poorly: the T3 exception. | Carry all four cases as one table in the calendar integration file. | None |
| 2 | - | T4 | `calendar-view-rules.test.mjs:168-183` tests the same function through a transplant with stubbed `calendarWall`/`calendarInstant`. | Add its "skipped local date emits once" case here through the real module with a zone that skips a day (e.g. `Pacific/Apia` 2011-12-30) and delete the transplant. | Low |

## Proposed end state
A "recurrence" section in `test/integration/calendar.test.ts` with five table rows (DST daily, weekday/weekly/all-day,
old-series seek + truncation, half-hour zones, skipped date). This file is removed.
