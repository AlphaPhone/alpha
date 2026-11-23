# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderNotificationActions.java
- Lines: 20 | Role: finds a posted reminder's Done / Snooze / Ask action by title and requires exactly that set. | Verdict: MERGE into `ReminderUiTestDriver.java` (renamed `ReminderTestSupport`)
- Importers: `ReminderLifecycleInstrumentedTest` (`:109-112`), `ReminderOneOffInstrumentedTest` (`:35,37,45`), `ReminderRecurrenceInstrumentedTest` (`:47-48`). Should also be used by `ReminderNoticeQuestionInstrumentedTest` (`:47,50` index `actions[2]`). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-20 | C4 | One of two tiny Reminder helper classes (`ReminderUiTestDriver`, 30 lines) while ~8 more reminder helpers are copy-pasted per test (`notification`, `clean`, `grant`, `postDue`, `alarm`, `isolated`). | Fold into one `ReminderTestSupport` holding every shared reminder test helper. | none |
| 2 | 10 | C6 (fine) | `"Done"`, `"Snooze 10 minutes"` are user-visible copy owned upstream; `ASK` comes from `AlphaReminders.CONFIGURATION.questionActionLabel`. | Keep as is. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DONE` / `SNOOZE` / `ASK` | const | 10 | `ReminderNoticeQuestionInstrumentedTest.java:47` (index-based) | `ReminderTestSupport` |
| `action` / `intent` | helper | 13-19 | same | `ReminderTestSupport` |

## Proposed end state
Content moves into `ReminderTestSupport`; file deleted. 0 lines here.

## Verification
ReminderLifecycle, ReminderOneOff (`scripts/test-reminder-one-off.ts`), ReminderRecurrence (`scripts/test-reminder-recurrence.ts`), ReminderNoticeQuestion.
