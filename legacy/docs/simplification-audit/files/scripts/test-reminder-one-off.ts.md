# scripts/test-reminder-one-off.ts
- Lines: 33 | Kind: Android device campaign (one instrumentation method in an owned secondary user after granting POST_NOTIFICATIONS) | Verdict: MERGE with `test-reminder-recurrence.ts`, `test-reminder-recovery.ts`, `test-reminder-recurrence-recovery.ts` and `reminder-recovery-fixture.ts` into `test/android/campaigns/reminders.ts <one-off|recurrence|recovery|recurrence-recovery>`
- Covers: real one-off alarm, snooze, Done, history and replay safety. Duplicates: `test-reminder-recurrence.ts` is the same file with two values changed. Callers/importers: `scripts/android-instrumentation.ts:310` (campaign list); `test/fixtures/isolated-native-campaign.mjs:7` (runner tests). No workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 | Near-verbatim twin of `test-reminder-recurrence.ts` (testClass, method, gate, expectedTests differ). | One case table. | None |
| 2 | 17-31 | C3 | SDK >= 33 check + POST_NOTIFICATIONS grant repeated in both twins. | One `prepare` shared by reminder cases. | None |

## Proposed end state
One reminders campaign file with four cases; this file deleted.
