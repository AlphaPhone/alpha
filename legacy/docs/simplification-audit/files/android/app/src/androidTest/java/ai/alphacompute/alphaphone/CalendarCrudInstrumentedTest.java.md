# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarCrudInstrumentedTest.java
- Lines: 90 | Role: Calendar form create/edit/conflict/delete-review through the product UI on the real provider; revoked ACL during delete review | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-calendar-regression.ts:63` (`['CalendarCrudInstrumentedTest','calendarCrud',2]` — count 2 pinned) and `scripts/test-calendar-crud-review.ts`. Text/path pins: those runners.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-60 | T4 | Lines 33-60 are a verbatim copy of `CalendarFlowInstrumentedTest.calendarFormPersistsOneRealEventAcrossRecreation:43-70` (create, edit, concurrent edit, recreate); this method then adds the delete-review steps. Both run in the same regression runner. | Keep this (superset) method; delete the CalendarFlow copy (see that report). | Low |
| 2 | 71-72 | C3 | `nativeWait/nativeClick` via `findAccessibilityNodeInfosByText`. | `NativeUiDriver`. | Low |
| 3 | 79-80 | C6 | Hard-codes `"Alpha Phone"` / `"alpha-phone-local"` = `AlphaCalendarPlugin.CONFIGURATION.accountName/localCalendarName`. | Use `CONFIGURATION`. | Low |
| 4 | 19-24 | C3 / D4 | `eval/until/click`, and `tapVisibleEvent` one-line forwarder to `CalendarUiTestDriver`. | Call `CalendarUiTestDriver` directly; add `click` there. | Low |
| 5 | 40, 50 | C3 | Title setter snippet (27 files). | `WebViewTestDriver.setValue`. | Low |
| 6 | 38, 59, 84 | C3 | "open Calendar" sequence `eval(AppNavigation.request("Calendar"));until(selected);declineStartupAccess()` (8× in CalendarFlow, 6 other Calendar files). | `CalendarUiTestDriver.open()`. | Low |
| 7 | 25-28 | C3 | `ids(resolver,title)` = CalendarFlow:36-39. | `CalendarProviderFixture.ids(title)`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `click` | helper | 21-23 | CalendarFlow:32, CalendarRange:23, CalendarTruncation:21, CalendarExternalEditor:31 | `CalendarUiTestDriver.click` |
| `ids` | helper | 25-28 | CalendarFlow:36 | `CalendarProviderFixture` |
| `nativeWait/nativeClick` | helpers | 71-72 | see NativeUiDriver | `NativeUiDriver` |

## Proposed end state
Two methods on `CalendarUiTestDriver` + `CalendarProviderFixture` + `NativeUiDriver`; identity constants from
`CONFIGURATION`. Est. ~75 lines.

## Verification
`node scripts/test-calendar-regression.ts --case=CalendarCrudInstrumentedTest`; `node scripts/test-calendar-crud-review.ts`.
