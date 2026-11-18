# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderOneOffInstrumentedTest.java
- Lines: 59 | Role: a real AlarmManager one-off reminder fires, Snooze is idempotent, a stale tap is retained, visible Done completes once, replays and recreation change nothing. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/test-reminder-one-off.ts:10` (`testClass: "ReminderOneOffInstrumentedTest"`, gate `oneOffAlarm=1`); `test/fixtures/isolated-native-campaign.mjs:18` (class map); `CAMPAIGN_RUNNERS` in `scripts/android-instrumentation.ts`. Not in CI workflows (manual campaign).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29, 51-56 | A1 | Second fixture `legacy_<uuid>` writes "an actual legacy-format stored row" (no `occurrenceId`) and checks deterministic migrated identity: "This is migration-state evidence". No such rows exist under the renamed package. | Delete lines 51-56 and the `legacy` id/cleanup with P5. | low (owner P5) |
| 2 | 18-19, 25-26 | C3 | `context()`, `notification(id)`, `until`, `clean(id)` copied in 4-5 Reminder tests. | `ReminderTestSupport`. | none |
| 3 | 20-24 | C3 | `state(id,expected)` status poll with a 13-minute posted budget; `ReminderRecurrence.state` (`:24-36`) is the same with a computed budget and richer diagnostic. | One `ReminderTestSupport.awaitStatus(c,id,status)` (Recurrence's version). | none |
| 4 | 48 | B5 | `scenario.diagnosticCheckpoint(...)` x3 between steps. | Keep only if `BoundedActivityScenario` diagnostics are read by the campaign; otherwise delete. | none |
| 5 | 25, 38, 48 | D8 | 400-1,200-character lines. | Format. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `state` | helper | 20-24 | `ReminderRecurrenceInstrumentedTest.java:24-36`, `ReminderRecoveryInstrumentedTest.java:20` (`awaitStatus`) | `ReminderTestSupport.awaitStatus` |
| `until` | helper | 25 | Reminder tests x6 | `WebViewTestDriver.until` |
| `notification` / `clean` | helper | 19, 26 | 4-5 files | `ReminderTestSupport` |

## Proposed end state
One alarm journey without the legacy row; shared status/notification/clean helpers. ~50 lines.

## Verification
`node scripts/test-reminder-one-off.ts` (permission-restoring campaign); `test/fixtures/isolated-native-campaign.mjs` users.
