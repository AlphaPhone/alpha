# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderRecurrenceInstrumentedTest.java
- Lines: 78 | Role: a real daily recurring alarm fires, snooze/Done advance exactly once; civil-time rules (DST gap/fold, weekdays, weekly) and edit staleness. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/test-reminder-recurrence.ts:10` (`testClass`, gate `recurrenceAlarm=1`); `test/fixtures/isolated-native-campaign.mjs:18`. Manual campaign.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 59-77 | T3 | `civilScheduleSkipsWeekendHandlesGapAndEditInvalidatesOldDecisions` has no gate and no device dependency: pure upstream ReminderEngine civil-time arithmetic through `ReminderTestAccess`. It only runs under `--all` (not registered, not in the campaign's method list). | Move to the upstream plugin's tests (upstream internals, like ReminderDeletionJournal), or register it so it actually runs. | low |
| 2 | 20-23, 37 | C3 | `context`, `clean`, `notification`, `until` duplicated across Reminder tests. | `ReminderTestSupport`. | none |
| 3 | 21 | C3 | `rule(kind,zone,day,time)` recurrence JSON builder; inline copies at `ReminderLifecycle :95`, `ReminderRecurrenceRecovery :30`, `ReminderTiming :93,122`, `ReminderUpgrade :50`. | `ReminderTestSupport.rule(...)`. | none |
| 4 | 44 | C3 | Next-whole-minute computation duplicated (see ReminderLifecycle report). | `ReminderTestSupport.nextWholeMinute`. | none |
| 5 | 74-75 | D8 | try/fail/catch idiom. | `assertThrows`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `rule` | helper | 21 | 5 inline copies (finding 3) | `ReminderTestSupport` |
| `state` | helper | 24-36 | `ReminderOneOffInstrumentedTest.java:20-24` | `ReminderTestSupport.awaitStatus` |

## Proposed end state
The alarm journey stays; the pure civil-time method moves upstream or gets registered; shared helpers. ~70 lines (~50 if the civil method moves upstream).

## Verification
`node scripts/test-reminder-recurrence.ts` (alarm method); `--classes ReminderRecurrence` once registered for the civil method.
