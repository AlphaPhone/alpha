# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderUpgradeInstrumentedTest.java
- Lines: 86 | Role: installed-upgrade campaign: seed reminders/receipts/tap ledger with the old APK, replace the APK without clearing data, verify bytes, identities and receipts in a new process. | Verdict: SIMPLIFY
- Importers: referenced in Javadoc by `WorkflowLegacyReminderUpgradeInstrumentedTest.java:14`. Text/path pins: `scripts/test-installed-upgrade.ts:68,70` (class name, gate `reminderUpgrade=seed|verify`); `test/installed-upgrade-runner.test.mjs:61-64,120` (fake runner matching `.ReminderUpgradeInstrumentedTest` and the `reminderUpgrade` phases). Manual campaign (not in workflows).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25, 42, 45-47, 63, 72, 81 | A1 | Seeds the pre-envelope store `LEGACY="alpha-local-reminders-v1"` with `upgrade_legacy` and a `malformed_neighbor`, then verifies them after upgrade. No such store exists under `ai.alphacompute.alphaphone` (PRD: no migration). | With P5: drop `LEGACY`, the `upgrade_legacy` seed/target and the `malformed_neighbor` check; keep the generic "update keeps reminders, receipts, tap ledger and alarms" test (the research's recommended survivor). | medium (owner P5; also `WorkflowLegacyReminderUpgrade` companion) |
| 2 | 26-27 | C6 | Literal `"ai.alphacompute.alphaphone.REMIND"`, `"alpha-reminder:"`, `"ai.alphacompute.alphaphone.OPEN_REMINDER"`, `"alpha-reminder-tap:"`; owner is `AlphaReminders.CONFIGURATION`. Here the literals are arguably intentional (an upgrade must keep installed names), so pin them in one place. | `ReminderTestSupport.alarm/tap` reading `AlphaReminders.CONFIGURATION`, plus one explicit "installed names unchanged" assertion. | low |
| 3 | 55-58 | C3 | Schedule-ahead/sleep/deliver sequence. | `ReminderTestSupport.postDue`. | none |
| 4 | 52 | C6 | `"b".repeat(64)` binding. | `ReminderTestAccess.digest(...)` like the other tests. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ENVELOPE` / `LEGACY` | const | 25 | `AlphaReminders.java:12`, `ReminderCapacity :72`, `ReminderLifecycle :47,57` | `AlphaReminders.CONFIGURATION.envelopeName` (LEGACY deleted) |
| `alarm` / `tap` | helper | 26-27 | ReminderAgent, ReminderTiming, ReminderLifecycle | `ReminderTestSupport` |

## Proposed end state
Seed/verify phases for current-format data only (future, repeat, quiet task receipt, posted + captured tap); legacy seed
removed with the P5 decision and `WorkflowLegacyReminderUpgradeInstrumentedTest` reconsidered with it. ~70 lines.

## Verification
`node scripts/test-installed-upgrade.ts reminder ...` (two APK builds, owned secondary user); `node --test test/installed-upgrade-runner.test.mjs` (fake runner pins class name and phases).
