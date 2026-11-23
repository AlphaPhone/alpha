# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarTruncationInstrumentedTest.java
- Lines: 53 | Role: 2,001 real provider rows exceed the 2,000-instance cap; the UI says "incomplete" and never "Free all day" | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-calendar-regression.ts` (`calendarRange`, method `realInstanceLimitCannotClaimAnUnreturnedDateIsFree`). Text/path pins: that runner, `test/calendar-range-reader.test.mjs:10` (comment), `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-28, 51 | C3 | Owned calendar + sync cleanup (15 files). | `CalendarProviderFixture`. | Low |
| 2 | 19-21 | C3 | `js/until/click` with bespoke diagnostics. | `CalendarUiTestDriver`. | Low |
| 3 | 33, 42 | C6 | `2001`/`2000`/`2002` literals for the cap; the cap is `CalendarConfiguration.maximumReadEvents` upstream. | Derive from `AlphaCalendarPlugin.CONFIGURATION.maximumReadEvents` (+1). | Low |
| 4 | 23 | NEW (gate reuse) | Gated on `calendarRange`, the same argument as `CalendarRangeInstrumentedTest`; the runner selects each by method so it works, but the gate name is misleading. | Keep (runner contract) or rename to `calendarTruncation` with the runner. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js/until/click` | helpers | 19-21 | Calendar UI tests | `CalendarUiTestDriver` |

## Proposed end state
Same scenario, shared fixture/driver, cap from configuration. Est. ~45 lines.

## Verification
`node scripts/test-calendar-regression.ts --case=CalendarTruncationInstrumentedTest`.
