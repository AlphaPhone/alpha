# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderUiTestDriver.java
- Lines: 30 | Role: after a stale notification tap, asserts the tap was retained without opening a replacement, then opens the current Calendar row by title. | Verdict: SIMPLIFY (rename to `ReminderTestSupport` and make it the single reminder test helper)
- Importers: `ReminderOneOffInstrumentedTest` (`:38,48`), `ReminderRecurrenceInstrumentedTest` (`:49`). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C4 / D11 | Named "UiTestDriver" but holds two reminder-specific steps, while ~10 reminder helpers are copy-pasted per test class (`notification`, `clean`, `grant`, `postDue`, `alarm`, `isolated`, `rule`, `nextWholeMinute`, `awaitStatus`, `open`) plus `ReminderNotificationActions`. | Rename to `ReminderTestSupport`; move those helpers and `ReminderNotificationActions` in (see the per-test reports). | none |
| 2 | 12-16 | C3 | Private `until` (20 s poll). | `WebViewTestDriver.until`. | none |
| 3 | 18-19 | C3 | Hand-written `do{...}while(deadline)` poll. | Shared `await` helper. | none |
| 4 | 26 | C6 | `button[aria-label="Retry calendar and reminders"]` also in `ReminderStaleInstrumentedTest` (5x). | One constant here. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until` | helper | 12-16 | ~40 files | `WebViewTestDriver` |
| `assertStaleTapRetained` | helper | 17-23 | none | keep |
| `openCurrent(title)` | helper | 24-29 | none | keep |

## Proposed end state
`ReminderTestSupport` (~70 lines) containing these two steps plus every shared reminder helper listed above and the
`ReminderNotificationActions` content; ~200 lines of per-test copies disappear from 12 Reminder test classes.

## Verification
All Reminder campaigns: `scripts/test-reminder-one-off.ts`, `scripts/test-reminder-recurrence.ts`, `scripts/reminder-recovery-fixture.ts`, `scripts/ci/pending-recovery-ui.py`, plus registered ReminderCapacity/HeadsUp/Lifecycle/Stale/NoticeQuestion.
