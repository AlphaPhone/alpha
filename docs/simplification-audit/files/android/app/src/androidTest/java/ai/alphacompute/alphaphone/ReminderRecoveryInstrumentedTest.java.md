# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderRecoveryInstrumentedTest.java
- Lines: 58 | Role: phased (prepare/denied/retry/prepare-reboot/cleanup) one-off reminder recovery across a real permission revoke and reboot, driven by an external runner. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/reminder-recovery-fixture.ts:33-34` (`testClass`, `testMethod: 'permissionAndRebootPhase'`, gate `reminderPhase`, prefs `alpha-reminder-recovery-test`, id regex `^recovery_`); wrapper `scripts/test-reminder-recovery.ts`; `test/fixtures/isolated-native-campaign.mjs:18`. Manual campaign, not CI.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52-53 | A7 | `verify-reboot` phase only `fail(...)`s ("Verify reboot externally"); grep `verify-reboot` in scripts: the fixture never sends it. | Delete the branch. | none |
| 2 | 21 | C6 | Literal `"ai.alphacompute.alphaphone.OPEN_REMINDER"`; owner constant `AlphaReminders.CONFIGURATION.openAction`. Same literal in `ReminderRecurrenceRecovery :23`, `ReminderUpgrade :27`. | Use the configuration field via `ReminderTestSupport.open(c,id[,occurrence])`. | none |
| 3 | 18-20 | C3 | `until`, `click` (identical to `ReminderRecurrenceRecovery :26`), `awaitStatus`. | `ReminderTestSupport` / `WebViewTestDriver`. | none |
| 4 | 22-57 | C5 | Same phase structure as `ReminderRecurrenceRecoveryInstrumentedTest` (prepare/denied/retry/prepare-reboot/cleanup) with a different fixture pref and gate; one runner (`reminder-recovery-fixture.ts`) already parameterises both. | Merge into one class with two methods (one-off, recurring) sharing phase code; runner passes `testMethod`. Optional. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PREFS` | const | 17 | pinned in `scripts/reminder-recovery-fixture.ts:45` | keep |
| `until` / `click` / `awaitStatus` / `open` | helper | 18-21 | `ReminderRecurrenceRecoveryInstrumentedTest.java:21-26` | `ReminderTestSupport` |

## Proposed end state
Phases minus the dead `verify-reboot`; shared helpers; optionally merged with the recurring variant. ~52 lines.

## Verification
`node scripts/test-reminder-recovery.ts APP.apk TEST.apk OUT` (owned secondary user, reboot); keep the `PREFS` name and id prefix the runner asserts.
