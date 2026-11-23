# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderRecurrenceRecoveryInstrumentedTest.java
- Lines: 74 | Role: phased recurring-reminder recovery across real permission revoke and reboot, driven by `reminder-recovery-fixture.ts`. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/reminder-recovery-fixture.ts:33-34,45` (class, `permissionAndActualRebootPhase`, gate `recurrencePhase`, prefs `alpha-recurring-recovery-test`, id regex `^recurring_recovery_`); wrapper `scripts/test-reminder-recurrence-recovery.ts`; `test/fixtures/isolated-native-campaign.mjs:18`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-73 | C5 | Twin of `ReminderRecoveryInstrumentedTest` (same phases, different fixture). | Optional merge into one recovery class with two methods (see that report). | low |
| 2 | 21, 26 | C3 | `until`, `click` identical to ReminderRecovery `:18-19`. | `ReminderTestSupport`/`WebViewTestDriver`. | none |
| 3 | 23 | C6 | `"ai.alphacompute.alphaphone.OPEN_REMINDER"` literal. | `AlphaReminders.CONFIGURATION.openAction`. | none |
| 4 | 28-31 | C3 | Next-minute + daily `rule` JSON built inline. | `ReminderTestSupport.nextWholeMinute/rule`. | none |
| 5 | 55-56, 64-65 | C3 | Two hand-written `do{read;sleep}while` status polls. | `ReminderTestSupport.awaitStatus` / `awaitOccurrenceChange`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `FIXTURE` | const | 20 | pinned by `scripts/reminder-recovery-fixture.ts:45` | keep |
| `open` / `click` / `until` / `schedule` | helper | 21-32 | ReminderRecovery `:18-21` | `ReminderTestSupport` |

## Proposed end state
Same phases with shared helpers (or merged with ReminderRecovery). ~66 lines.

## Verification
`node scripts/test-reminder-recurrence-recovery.ts` (owned secondary user, reboot).
