# scripts/test-calendar-query-race.ts
- Lines: 55 | Kind: source transplant (same `scripts/fixtures/calendar-adapter.ts` vm harness) | Verdict: DELETE; REWRITE one case into `test/browser/journeys/calendar.spec.ts`
- Covers: a delayed provider read for range A that settles after the view moved A->B->A is discarded and A is queried again; source display reads issue no extra query. Duplicates: `test/calendar-range-reader.test.mjs` (native range reader), `test/browser/calendar-month-focus.spec.ts` / `dev-calendar-navigation.spec.ts` (navigation, not the stale-read race), `CalendarRangeInstrumentedTest#distantDatesLoadRealRowsAndNewestNavigationWins` (device, newest navigation wins). Callers/importers: `test/adapter-contracts.test.mjs` list.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 29 | T2 | Runs transplanted adapter text with a fake shell; asserts on `views.calendar.displaySources()` internals. | Delete. | L |
| 2 | 38-39 | T3 | Drives range by mutating `state.month` directly instead of navigating. | Journey: hold the bridge `list` promise, tap next month then back, release, assert the current range's event is shown once. | L |

## Proposed end state
One journey case "stale month read is discarded" in `journeys/calendar.spec.ts`; script deleted.
