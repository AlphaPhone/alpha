# specs/quint/refinement/native/calendar-sync-enable-platform.mjs
- Lines: 218 | Kind: Quint harness platform (materialises patched upstream Calendar/deletion sources, generates Android/Capacitor/product port classes, reuses and string-edits stubs from `scoped-calendar-review-platform.mjs` and host test fixtures) | Verdict: KEEP (D18); SIMPLIFY
- Covers: compile environment for model `NativeCalendarSyncEnable`: real `CalendarSyncBridge`, `CalendarSyncSnapshot`, `CalendarSyncMutation`, `CalendarSyncReceiptRecovery`, `CalendarSyncConsent`, `LocalAgentProviderAdmission`, `HostedResultNotices` with a CAS credential store that can hold the journal read before/after loading. Callers: `calendar-sync-enable.mjs:6,15`.

## Inputs read as text
- `scoped-calendar-review-platform.mjs` port strings, edited by `.replace` on `' public String getString(String key){'`, `'ACCOUNT_TYPE_LOCAL="LOCAL";'`, `'CAL_ACCESS_CONTRIBUTOR=500;'`, `'STATUS_CANCELED=2;'`, `'public static final class Reminders'`.
- Upstream test stubs `vendor/eliza/plugins/plugin-native-calendar/test/jvm/android/{content/ContentValues,net/Uri}.java` edited on `'public void put(String key,Long value)'` and `'public Uri build(){'`.
- `test/fixtures/scoped-calendar-jvm/android/content/ContentResolver.java` edited on `'public abstract class ContentResolver {'`.
- Compiled host-test fixtures `test/fixtures/SqliteCalendarProvider.java`, `test/fixtures/CalendarSyncSnapshotTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 211-213 | dependency | Compiles `test/fixtures/CalendarSyncSnapshotTest.java` (a host unit-test class) for its `Provider`, and `SqliteCalendarProvider.java`. Their reports say KEEP/MOVE to a Gradle JVM suite; if they move, this path list must follow. | Move the provider fake into a refinement port file, or reference the new location in the same change. | Medium (ordering) |
| 2 | 28-36, 205-209 | C5 / T10 | Stubs are produced by string-replacing other stubs (4 sources edited). Fragile and hard to read. | Check in the completed stub `.java` files under `refinement/native/ports/` shared by scoped-calendar-review and this harness. | Low |
| 3 | 106-120, 121-136, 137-179 | — | Closed ports throw on any provider write, deletion stage or unexpected Cloud selection: strong negative checks. | Keep. | — |
| 4 | 18 compiled list in driver | dependency | `HostedResultNotices` is compiled because `CalendarSyncBridge` references it; if D5 hosted cleanup removes or reshapes it, this list changes. | Track with A4. | Low |
| 5 | — | owner question | D18 keeps the Android Calendar sync pending Q-CAL-1; if retired, this platform, its driver, `CalendarSyncEnableTraces.java` and `NativeCalendarSyncEnable.qnt` go together. | None now. | — |

## Proposed end state
Same closed-port environment from checked-in shared port files; host-test fixture dependency replaced by a refinement-owned provider port.
