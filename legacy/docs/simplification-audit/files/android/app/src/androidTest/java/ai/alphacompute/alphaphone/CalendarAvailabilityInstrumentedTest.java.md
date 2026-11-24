# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarAvailabilityInstrumentedTest.java
- Lines: 167 | Role: free/busy reads on the real CalendarProvider through upstream `SelectedCalendarReader` with test-owned calendars | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-calendar-regression.ts` case `['CalendarAvailabilityInstrumentedTest','calendarAvailability',4]` — **the `4` pins the method count**. Text/path pins: `test/calendar-regression-runner.test.mjs`, `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 160-166 | T3 | `timeZoneMatchesByRulesNotSpelling` unit-tests the 1-method `CalendarZones.sameZone` (main `CalendarZones.java`, research suggests inlining it into `AlphaCalendarPlugin`) inside an emulator class; `test/calendar-availability-reader.test.mjs:17` also reads `CalendarZones.java`. | Inline `CalendarZones` into `AlphaCalendarPlugin` and delete this method; update the runner count `4`→`3` and `test/calendar-availability-reader.test.mjs:17`. | Low |
| 2 | 60-71 | C3 | Owned local calendar via sync-adapter URI (`sync()` + `calendar()`) — the same block exists in 15 androidTest files (grep `CALLER_IS_SYNCADAPTER`). | `CalendarProviderFixture.ownedCalendar(label,access)` + `close()`. | Low |
| 3 | 100-158 | T5 (question) | All three provider methods exercise only upstream `SelectedCalendarReader` (no Alpha class). | Keep as Alpha's provider acceptance of the reader it ships (it needs a real provider), but say so; or move upstream if upstream gains an emulator lane. | Low |
| 4 | 50-56 | KEEP | `Assume` on permissions (runner grants them). | none | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `INSTANT` formatter | const | 41 | `CalendarAgentCrud:59` builds the same formatter inline | `CalendarProviderFixture.iso(ms)` |
| `HOUR/DAY` | const | 42 | literal `3600000`/`86400000` in 10 Calendar tests | `CalendarProviderFixture` |
| `sync/calendar/event` | helpers | 60-79 | 15 files | `CalendarProviderFixture` |
| `chosen/row/assertRows` | helpers | 80-98 | none | keep |

## Proposed end state
Three provider methods on `CalendarProviderFixture`; the zone unit test removed with `CalendarZones`. Est. ~140 lines.

## Verification
`node scripts/test-calendar-regression.ts --case=CalendarAvailabilityInstrumentedTest`; `node --test test/calendar-regression-runner.test.mjs test/calendar-availability-reader.test.mjs`.
