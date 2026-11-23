# scripts/test-reminder-recurrence-recovery.ts
- Lines: 3 | Kind: CLI wrapper of `reminder-recovery-fixture.ts` (device campaign) | Verdict: MERGE into `test/android/campaigns/reminders.ts recurrence-recovery`
- Covers: recurring reminder recovery after reboot. Duplicates: `test-reminder-recovery.ts`. Callers/importers: `test/fixtures/isolated-native-campaign.mjs:7`; comment in `ReminderRecurrenceRecoveryInstrumentedTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | C5/D4 | Pass-through with `recurring=true`. | Case in the merged campaign. | None |

## Proposed end state
Deleted.
