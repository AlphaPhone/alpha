# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderHeadsUpInstrumentedTest.java
- Lines: 60 | Role: a due reminder on the high-importance channel is shown heads-up by System UI (accessibility windows, else `dumpsys` HeadsUpManager map). | Verdict: KEEP
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:284` (`ReminderHeadsUp: { note: ... }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 57 | T4 | Asserts the due channel is `IMPORTANCE_HIGH`, the same assertion as `ReminderLifecycleInstrumentedTest.dueRemindersUseASeparateHighImportanceChannel` (`:36-43`). | Keep here (it also proves the effect); delete the Lifecycle method or keep it as the no-permission variant. | none |
| 2 | 58 | C3 | `cancel(c,id)` + `Envelope(c).records().edit().remove(id).commit()` cleanup = `clean(id)` in `ReminderLifecycle :33`, `ReminderOneOff :26`, `ReminderRecurrence :22`, `ReminderRecovery :55`, `ReminderRecurrenceRecovery :38`. | `ReminderTestSupport.clean(c,id)`. | none |
| 3 | 54 | C6 | Notification key format `"0|"+pkg+"|0|"+tagPrefix+id+"|"+uid` hand-built (Android's internal key format). | Keep (no API); comment says why. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `visible(automation,title)` | helper | 22-28 | `ReminderTapProcessDeath.visibleNode` (different scope) | keep |
| `pinnedHeadsUp` | helper | 32-41 | none | keep |

## Proposed end state
Unchanged test; cleanup via shared `clean`. ~55 lines.

## Verification
`--classes ReminderHeadsUp` (skips unless notifications enabled and DND off).
