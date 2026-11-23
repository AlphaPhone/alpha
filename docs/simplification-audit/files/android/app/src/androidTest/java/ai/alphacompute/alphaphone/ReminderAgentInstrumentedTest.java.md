# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderAgentInstrumentedTest.java
- Lines: 116 | Role: agent-reviewed reminder operations (read/update/snooze/complete/reschedule/cancel) with durable receipts; plus a process-replacement phase and a legacy-store migration check. | Verdict: SIMPLIFY
- Importers: none; uses `ai.eliza.plugins.reminders.ReminderTestAccess` (androidTest accessor into upstream package). Text/path pins: `scripts/ci/pending-recovery-ui.py:24` runs `ReminderAgentInstrumentedTest#selectedCrudPersistsExactReceiptsAndRejectsChangedBindings` with `reminderAgent=1` (CI: `resident-android.yml:606`); `scripts/ci/test-pending-recovery-phases.py:7` pins the same selector string. Not in `CLASS_REGISTRY` (reachable through the campaign).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-38 | A7 / T9 | `receiptSurvivesActualProcessReplacement` runs only with `reminderAgentPhase=prepare|verify|cleanup`; grep `reminderAgentPhase` in scripts/test/.github: 0 hits. No runner provides the phases. | Delete the method (19 lines) and the `alpha-reminder-agent-process-fixture` prefs it uses. | none |
| 2 | 39-53 | A1 | `legacyMigrationRetainsRawRecordsAndOccurrenceIdentity` seeds `alpha-local-reminders-v1` (the pre-envelope store) and asserts `legacyArchive`/`occurrenceId.startsWith("legacy_")`. Under the renamed package no such store can exist (PRD: no migration). The reader lives upstream in `ReminderEnvelope` and is enabled by `AlphaReminders.CONFIGURATION`'s second argument `"alpha-local-reminders-v1"` (`AlphaReminders.java:12`). | Delete with the P5 decision; coordinate with `AlphaReminders` (pass no legacy name if upstream allows) and `specs/quint/refinement/native/ReminderDeliveryTraces.java:253` ("Upgrade retains the exact legacy row"). | medium (owner decision P5) |
| 3 | 76, 94 | C6 | Alarm `PendingIntent` probe rebuilt with literals `"ai.alphacompute.alphaphone.REMIND"` / `"alpha-reminder:"`; `ReminderLifecycle :68` uses `AlphaReminders.CONFIGURATION.remindAction/alarmUriPrefix`; `ReminderTiming :37` and `ReminderUpgrade :26` repeat the literals. | One `ReminderTestSupport.alarm(c,id,occurrence)` built from `AlphaReminders.CONFIGURATION`. | none |
| 4 | 70-71, 98, 107 | D8 | `try{...;fail(...)}catch(IllegalArgumentException expected){}` repeated 4 times. | `assertThrows(IllegalArgumentException.class, ...)` (JUnit 4.13). | none |
| 5 | 54-115 | D8 | 60-line method with 6 distinct phases on dense lines. | Split into private steps (`readAndUpdate`, `snoozeIdempotent`, `completeKeepsHistory`, `rescheduleNewOccurrence`, `cancelIsTerminal`). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| alarm PendingIntent probe (inline) | helper | 76-77, 94-95 | `ReminderTimingInstrumentedTest.java:37`, `ReminderUpgradeInstrumentedTest.java:26`, `ReminderLifecycleInstrumentedTest.java:68-69` | `ReminderTestSupport.alarm` |
| ContextWrapper prefs-prefix isolation | helper | 41 | `ReminderCapacityInstrumentedTest.java:26-28`, `ReminderLifecycleInstrumentedTest.java:47` | `ReminderTestSupport.isolated(base,prefix)` |

## Proposed end state
Only `selectedCrudPersistsExactReceiptsAndRejectsChangedBindings` remains, split into named steps, using shared alarm/isolation
helpers and `assertThrows`. Delete the unrunnable process-phase method now and the legacy migration method with P5. ~62 lines.

## Verification
`python3 scripts/ci/pending-recovery-ui.py` (phase with `reminderAgent=1`, CI resident-android); `python3 scripts/ci/test-pending-recovery-phases.py` (pins the selector string).
