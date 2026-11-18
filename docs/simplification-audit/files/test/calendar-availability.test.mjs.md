# test/calendar-availability.test.mjs
- Lines: 7 | Kind: tooling wrapper (spawns `scripts/test-calendar-availability-flow.ts`, 259 lines, via `child-suite.mjs`) | Verdict: MERGE (script body into `test/integration/calendar.test.ts`, then delete wrapper and script)
- Covers: the free/busy executor (`executeCalendarAvailability`) and the real `DeviceActions` client over a synthetic provider: chosen calendars only, no titles leak, permission/timezone changes, source-list retries. Duplicates: `test/browser/calendar-availability.spec.ts` (real renderer, journal, review dialogs; 9 modes); `CalendarAvailabilityInstrumentedTest` on device. Callers/importers: `npm test` glob; the script has no other caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | T9 | The test is a script; the wrapper only runs it. | Move the script's distinct cases into the calendar integration file. | None |
| 2 | script | T4 | Share, all-day, free, cancel and changed-during-review overlap the Playwright spec's modes. | Carry only what the browser cannot reach: title/foreign-calendar non-disclosure in the wire payload, retry count `SOURCE_LIST_ATTEMPTS`, timezone-changed refusal. | Low |
| 3 | script 7 | D13 | Imports `.eliza/client-features/packages/contracts/src/device-reviews.ts` by relative path. | Use the `@eliza/*` alias once it exists. | None |

## Proposed end state
Wrapper and `scripts/test-calendar-availability-flow.ts` deleted. Three or four cases in
`test/integration/calendar.test.ts`; the user journey stays in `journeys/calendar.spec.ts` (from
`calendar-availability.spec.ts`).
