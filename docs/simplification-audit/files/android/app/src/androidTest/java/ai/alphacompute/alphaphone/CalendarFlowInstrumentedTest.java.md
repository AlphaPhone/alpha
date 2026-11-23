# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarFlowInstrumentedTest.java
- Lines: 241 | Role: Calendar UI on the real provider with a forced device zone — form persistence, all-day civil dates, DST gap/fold, multi-day segments | Verdict: SIMPLIFY
- Importers: none. Registry `CalendarFlow` (`scripts/android-instrumentation.ts:282`) and `scripts/test-calendar-regression.ts:63` (`['CalendarFlowInstrumentedTest','calendarFlow',5]` — **count 5 pinned**). Text/path pins: `test/android-instrumentation-runner.test.mjs`, `test/calendar-regression-runner.test.mjs`, `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-73 | T4 | `calendarFormPersistsOneRealEventAcrossRecreation` is a verbatim copy of `CalendarCrudInstrumentedTest.calendarCrudPreservesIdentityAndRejectsStaleDelete:33-60` (create/edit/concurrent edit/recreate); CalendarCrud continues with delete review. Both run in the same regression runner. | Delete this method (−34 lines); change the runner count to 4 and its runner test expectation. | Low |
| 2 | 28-35 | C3 / D4 | `eval/until/click` duplicate `CalendarUiTestDriver.until`; `tapVisibleEvent` is a one-line forwarder. | Call `CalendarUiTestDriver` directly. | Low |
| 3 | 48, 69, 117, 126, 128, 147, 205, 223 | C3 (local) | `eval(AppNavigation.request("Calendar"));until(AppNavigation.selected("Calendar"));AppNavigation.declineStartupAccess();` 8×, plus the Home→recreate→Calendar dance twice (126, 128). | `CalendarUiTestDriver.open()` and `reopenAfterRecreate(scenario)`. | Low |
| 4 | 75-102 | C3 | `CalendarFixture` (owned calendar, zone switch with shell permission identity, event insert) — a richer twin of the calendar blocks in 14 other files. | Promote to `CalendarProviderFixture` (zone switching as an option). | Low |
| 5 | 103-110 | C3 | `chooseDate` = `CalendarRangeInstrumentedTest.date:24-35` (Range adds month-label waits). | `CalendarUiTestDriver.chooseDate(date, zone)`. | Low |
| 6 | 136-142, 197-199 | C3 (local) | "find next DST gap/overlap within 335 days, else previous" loop written twice. | `private static ZoneOffsetTransition transition(ZoneId zone, boolean gap)`. | Low |
| 7 | 36-39 | C3 | `ids(resolver,title)` = CalendarCrud:25-28. | `CalendarProviderFixture.ids`. | Low |
| 8 | 18-20 | KEEP | Comment explaining zone restore by the runner. | none | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval/until/click/tapVisibleEvent` | helpers | 28-35 | CalendarUiTestDriver, CalendarCrud, CalendarRange, CalendarTruncation | `CalendarUiTestDriver` |
| `ids` | helper | 36-39 | CalendarCrud | `CalendarProviderFixture` |
| `CalendarFixture` | class | 75-102 | 14 files' calendar blocks | `CalendarProviderFixture` |
| `chooseDate` | helper | 103-110 | CalendarRange.date | `CalendarUiTestDriver` |
| `assertProviderTimes/assertComplexEditHandoff` | helpers | 170-193 | `CalendarAgentCrud.provider` | keep / fixture |

## Proposed end state
Four zone-sensitive methods (all-day, DST gap, DST fold, multi-day) using the shared drivers; form-persistence copy
removed. Est. ~175 lines.

## Verification
`node scripts/test-calendar-regression.ts --case=CalendarFlowInstrumentedTest` (restores zone on process death);
`node --test test/calendar-regression-runner.test.mjs test/android-instrumentation-runner.test.mjs` after the count change.
