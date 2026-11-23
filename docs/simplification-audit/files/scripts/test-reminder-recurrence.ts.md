# scripts/test-reminder-recurrence.ts
- Lines: 32 | Kind: Android device campaign | Verdict: MERGE into `test/android/campaigns/reminders.ts recurrence`
- Covers: real recurring reminder alarms (two instrumentation tests). Duplicates: `test-reminder-one-off.ts` (same shape). Callers/importers: `scripts/android-instrumentation.ts:310`; `test/fixtures/isolated-native-campaign.mjs:7`; comments in `ReminderRecurrence*InstrumentedTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 | Twin of `test-reminder-one-off.ts`. | One case table. | None |

## Proposed end state
Deleted; one case in the merged reminders campaign.
