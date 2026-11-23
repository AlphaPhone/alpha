# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarRangeInstrumentedTest.java
- Lines: 52 | Role: distant past/future provider rows load through month navigation; newest navigation wins | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-calendar-regression.ts` (`calendarRange`, method `distantDatesLoadRealRowsAndNewestNavigationWins`). Text/path pins: that runner, `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-35 | C3 | `date(target)` = `CalendarFlowInstrumentedTest.chooseDate:103-110` plus month-label waits. | `CalendarUiTestDriver.chooseDate` (keep the label waits there; they make the shared version stricter). | Low |
| 2 | 42-43, 50 | C3 | Owned calendar + sync-URI cleanup (15 files). | `CalendarProviderFixture`. | Low |
| 3 | 18 | A8 | "beyond the former fixed window" — history narration. | "Rows 120 days back and 430 days ahead load through the visible date controls." | Low |
| 4 | 22 | C3 | `until` with a bespoke diagnostic JSON (also CalendarTruncation:20, CalendarUiTestDriver:13). | One `CalendarUiTestDriver.until` with a single diagnostics snapshot. | Low |
| 5 | 45, 48 | D8 | Event-insert loop and the three-visit assertion loop on single lines. | Formatter. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js/until/click` | helpers | 21-23 | all Calendar UI tests | `CalendarUiTestDriver` |
| `date` | helper | 24-35 | CalendarFlow.chooseDate | `CalendarUiTestDriver.chooseDate` |

## Proposed end state
One method on shared drivers. Est. ~40 lines.

## Verification
`node scripts/test-calendar-regression.ts --case=CalendarRangeInstrumentedTest`.
