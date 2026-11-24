# android/app/src/androidTest/java/ai/eliza/plugins/reminders/ReminderDeletionJournalFixture.java
- Lines: 89 | Role: split-package (`ai.eliza.plugins.reminders`) instrumentation fixture that drives the upstream `ReminderStore` deletion journal (stage/settle/pause/undo) through package-private API. | Verdict: MOVE upstream (delete here together with `ReminderDeletionJournalInstrumentedTest`)
- Importers: 2 — `androidTest/.../ReminderDeletionJournalInstrumentedTest.java` (pure forwarder, 4 `@Test` one-liners) and `ReminderTestAccess.java:36` (uses only the nested `Receiver` class). Text/path pins: `scripts/android-instrumentation.ts:277` lists runner `ReminderDeletionJournal: {}`; no `test/` or `specs/` pins.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-89 | T5 | Tests upstream internals: `package ai.eliza.plugins.reminders;` only so it can call package-private `ReminderStore.stageDeletion/settleDeletion/pauseDeletion/pendingDeletions`. No Alpha code is exercised except the generic engine. | Move the four scenarios to the upstream `plugin-native-reminders` instrumentation suite; delete this file, `ReminderDeletionJournalInstrumentedTest.java` and the `ReminderDeletionJournal` runner entry. Keep the nested `Receiver` (see #2). | Low for the product; coverage moves upstream. |
| 2 | 14 | C1 | `public static final class Receiver extends BroadcastReceiver{...}` no-op receiver is also the fixture receiver for `ReminderTestAccess.fixtureConfiguration()` (line 36). | When this file goes, move `Receiver` into `ReminderTestAccess`. | Low |
| 3 | 15 | C3/C5 | `config(String id)` builds a fixture `ReminderConfiguration` (19-arg form, id-prefixed names) — twin of `ReminderTestAccess.fixtureConfiguration()` (20-arg form). Also passes `id+"_legacy"` for the upstream legacy store name (A1 upstream). | If kept: one `ReminderTestAccess.fixtureConfiguration(String id, boolean isolatedPrefs)` used by both. | Low |
| 4 | 41, 57, 67, 80 | C3 | `"undo_"+UUID.randomUUID().toString().replace("-","")` repeated 4x; lines 43/59/69 repeat `seed; new ReminderStore; channel; assertTrue("Enable notifications...")`. | Extract `fixture()` returning context+config+store. | Low |
| 5 | 15, 18, 24, 26, 39 | D8 | Whole methods on single 200-400 character lines. | Formatter. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Receiver` | class | 14 | none (used by `ReminderTestAccess:36`) | `ReminderTestAccess` |
| `config(id)` | helper | 15 | `ReminderTestAccess.fixtureConfiguration()` (:34-37) | `ReminderTestAccess` |
| `clock(boot,elapsed)` | helper | 16 | none | upstream test |
| `notifying()` | helper | 19-23 | POST_NOTIFICATIONS grant repeated in many androidTest classes | shared androidTest util |
| `posted`, `dropAlarms`, `cleanup`, `seed` | helpers | 24-39 | none | upstream test |

## Proposed end state
File deleted (0 lines). The four deletion-journal scenarios live upstream next to `ReminderStore`. `Receiver` moves into `ReminderTestAccess`. `ReminderDeletionJournalInstrumentedTest.java` and the `ReminderDeletionJournal` entry in `scripts/android-instrumentation.ts` are deleted.

## Verification
Today: `ReminderDeletionJournalInstrumentedTest` via `scripts/android-instrumentation.ts`. After: upstream reminder instrumentation; re-run `npm run verify` (instrumentation runner list test `test/android-instrumentation-runner.test.mjs`) and the Android build.
