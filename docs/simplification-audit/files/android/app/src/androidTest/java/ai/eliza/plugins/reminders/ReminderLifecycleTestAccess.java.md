# android/app/src/androidTest/java/ai/eliza/plugins/reminders/ReminderLifecycleTestAccess.java
- Lines: 29 | Role: split-package accessor exposing upstream `ReminderStore` lifecycle internals (boot re-post, due channel, to-dos, StorageFull) to two Alpha instrumentation tests. | Verdict: MERGE into `android/app/src/androidTest/java/ai/eliza/plugins/reminders/ReminderTestAccess.java`
- Importers: 2 — `ReminderHeadsUpInstrumentedTest`, `ReminderLifecycleInstrumentedTest`. Text/path pins: none in `test/`, `specs/`, `scripts/`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-29 | C5 | Second accessor in the same package beside `ReminderTestAccess`; duplicates its private `store(c)` (`AlphaReminders.engine(c).store`, :11) and `restore`. | Merge the 8 members into `ReminderTestAccess`; delete file; update 2 importers. | Low |
| 2 | 15 | B4 | `public Isolated(Context c){store=new ReminderStore(...)}` ignores `c`. | Drop the parameter. | Low |
| 3 | 16-19 | D4 | `Isolated.schedule/saveTodo/read/cancel` are one-line forwards to `ReminderStore`. | Fine as test access; keep after merge. | None |
| 4 | 1-29 | T5 | Like its sibling, exists to reach upstream package-private API (`ReminderStore.StorageFull`, `bootId`, `todoDecision`). | Owner decision with the rest of the reminder-store instrumentation (see ReminderTestAccess report). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `store(Context)` | helper | 11 | `ReminderTestAccess.store(Context)` (:51-54) | `ReminderTestAccess` |
| `Isolated` | class | 13-20 | `ReminderTestAccess.isolate/release` (:23-31) — same idea, different mechanism | `ReminderTestAccess` |
| `markBoot` | helper | 26 | none | `ReminderTestAccess` |

## Proposed end state
Deleted; its members (about 20 lines) appended to `ReminderTestAccess`, reusing that class's `store(c)`.

## Verification
`ReminderHeadsUpInstrumentedTest`, `ReminderLifecycleInstrumentedTest` (instrumentation). Re-run the Android build (androidTest compile) and those two suites.
