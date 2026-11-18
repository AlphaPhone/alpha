# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderStaleInstrumentedTest.java
- Lines: 26 | Role: an injected `DailyApps.listReminders` rejection shows a persistent "Reminders may be out of date" warning that only a real native retry clears. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:285` (`ReminderStale: {}`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15, 23 | T6 | Monkey-patches `window.Capacitor.nativePromise` in the page to fail `listReminders`. | Accept as the fixture (Javadoc says so) or replace with a test-mocks native fault switch; keep for now. | low |
| 2 | 17 | D7 | Reflection `Plugin.class.getDeclaredMethod("notifyListeners",...)`.`setAccessible(true)` to fire `appResumed` from the test. | Trigger a real resume (`scenario.moveToState`/HOME and back) instead of reflecting into Capacitor. | low |
| 3 | 19 | T8 | Fixed `SystemClock.sleep(5000)` to prove the warning outlives a toast. | Wait for the toast element to disappear, then assert the warning. | none |
| 4 | 10-11 | C3 | Private `js`/`until`. | `WebViewTestDriver`. | none |
| 5 | 18, 20, 22 | C6 | `[aria-label="Retry calendar and reminders"]` selector repeated 5 times; also in `ReminderUiTestDriver :26`. | One constant (in `ReminderTestSupport`). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js` / `until` | helper | 10-11 | ~40 files | `WebViewTestDriver` |

## Proposed end state
Same scenario, real resume instead of reflection, condition wait instead of the 5 s sleep, shared selector constant. ~22 lines.

## Verification
`--classes ReminderStale` (registered, no gate).
