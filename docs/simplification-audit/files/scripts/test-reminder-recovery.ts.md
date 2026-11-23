# scripts/test-reminder-recovery.ts
- Lines: 3 | Kind: CLI wrapper of `reminder-recovery-fixture.ts` (device campaign: reminder recovery across reboot) | Verdict: MERGE into `test/android/campaigns/reminders.ts recovery`
- Covers: one-off reminder recovery after reboot. Duplicates: `test-reminder-recurrence-recovery.ts` (differs by one boolean). Callers/importers: `test/fixtures/isolated-native-campaign.mjs:7`; comment in `ReminderRecoveryInstrumentedTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | C5/D4 | Three-line pass-through to `runReminderRecovery(false, ...)`. | Case in the merged campaign; update the Java comment. | None |

## Proposed end state
Deleted; `reminders.ts recovery` replaces it.
