# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderLifecycleInstrumentedTest.java
- Lines: 120 | Role: "Patch 0040" reminder lifecycle: due channel, full-store refusal, undated to-dos, once-per-boot re-post with identical actions. | Verdict: SIMPLIFY
- Importers: none; uses `ReminderTestAccess`, `ReminderLifecycleTestAccess` (androidTest accessors in the upstream package) and `ReminderNotificationActions`. Text/path pins: `scripts/android-instrumentation.ts:195` (`ReminderLifecycle: { note: ... }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 45-59 | T4 | `fullStoreRefusesWithStorageFullBeforeAnyWrite` (fill 250, refuse) duplicates `ReminderCapacityInstrumentedTest` (`:20-75`), which is stricter. Unique part: the `saveTodo` refusal (`:53`). | Move the `saveTodo` refusal into ReminderCapacity; delete this method (15 lines). | none |
| 2 | 36-43 | T4 / A1 | `dueRemindersUseASeparateHighImportanceChannel` names the configured channel `legacy` and asserts it is "kept for compatibility"; `ReminderHeadsUp :57` already asserts the due channel is HIGH. The "blocked configured channel migrates as blocked" branch is a migration for installs that predate the due channel. | Delete with the P5 decision (upstream keeps the compat channel); otherwise rename the variable `configured`. | low |
| 3 | 26 | A8 | Javadoc "Patch 0040:" names a historical patch, not the behaviour. | Replace with what is covered. | none |
| 4 | 29-34 | C3 | `context()`, `manager()`, `notification(id)`, `clean(id)`, `find(rows,id)` are copied across Reminder tests (`notification(` in 4 files, `clean(` in 5). | `ReminderTestSupport`. | none |
| 5 | 67, 71, 77, 79 | D8 | `try{...;fail}catch(IllegalArgumentException expected){}` x5. | `assertThrows`. | none |
| 6 | 92 | D8 | Next-minute computation duplicated with `ReminderRecurrence :44`, `ReminderRecurrenceRecovery :28-29`. | `ReminderTestSupport.nextWholeMinute(minLeadMs)`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `notification(id)` | helper | 31 | `ReminderNoticeQuestion.java:32`, `ReminderOneOff.java:19`, `ReminderRecurrence.java:23` | `ReminderTestSupport` |
| `clean(id)` | helper | 33 | 5 files (see ReminderHeadsUp report) | `ReminderTestSupport` |
| `grant()` | helper | 32 | `ReminderNoticeQuestion.java:40`, `ReminderHeadsUp.java:45` | `ReminderTestSupport` |
| `find(rows,id)` | helper | 34 | none | keep |

## Proposed end state
Two tests remain (undated to-do lifecycle, reboot re-post); the full-store test merges into ReminderCapacity and the
channel test goes (or is renamed) per P5. Shared helpers from `ReminderTestSupport`. ~95 lines (~70 if the channel test goes).

## Verification
`--classes ReminderLifecycle` (the re-post method skips unless notifications are enabled); `--classes ReminderCapacity` after merging.
