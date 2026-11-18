# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderCapacityInstrumentedTest.java
- Lines: 76 | Role: the reminder store at its 250-record cap refuses new records without touching damaged/unresolved neighbours, and reclaims only explicit cancellations. | Verdict: KEEP (absorb one assertion)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:283` (`ReminderCapacity: {}`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-75 | T4 | Overlaps `ReminderLifecycleInstrumentedTest.fullStoreRefusesWithStorageFullBeforeAnyWrite` (`:45-59`, fills 250, asserts refusal). This test is the stronger one. | Keep this one; move Lifecycle's extra `saveTodo` refusal assertion here and delete the Lifecycle method. | none |
| 2 | 26-28 | C3 | ContextWrapper prefs-prefix isolation duplicated in `ReminderAgent :41`, `ReminderLifecycle :47`. | `ReminderTestSupport.isolated(base,prefix)`. | none |
| 3 | 72-73 | C6 | Literal pref names `"alpha-reminder-envelope-v1"`, `"alpha-local-reminders-v1"` (also `AlphaReminders.java:12`). | Use `AlphaReminders.CONFIGURATION.envelopeName/legacyName` (fields exist upstream; `ReminderTestAccess.java:36` reads them). | none |
| 4 | 44-66 | D9 (minor) | `new ReminderTestAccess.Envelope(context).records()` constructed 9 times. | One local `records()` lambda. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| prefix-isolating `ContextWrapper` | helper | 26-28 | 2 files (finding 2) | `ReminderTestSupport` |

## Proposed end state
Same test plus the to-do refusal check from ReminderLifecycle; shared isolation helper and configuration constants. ~72 lines.

## Verification
`--classes ReminderCapacity` (registered, no gate).
