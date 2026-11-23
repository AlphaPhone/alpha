# test/fixtures/ScopedCalendarSnapshotTest.java
- Lines: 67 | Kind: integration (host JVM: upstream `CalendarEventGuard` + `CalendarSourceIdentity` from the materialized native tree, `SqliteCalendarProvider` running real SQL, plus a hand-written in-memory `Provider`) | Verdict: KEEP; SIMPLIFY (extract the nested `Provider`, then port its cases to SQLite); upstream follow-up
- Covers: scoped Calendar deletion: occurrence vs series selection, revision changes when attendees change, compare-and-swap assertions matching exact rows in SQL, exception-insert for synced series, EXDATE update for local series, editor-review refusal for modified/unsynced series, read-only calendars refused, deletion verification. Duplicates: the Quint harness `specs/quint/refinement/native/scoped-calendar-review-platform.mjs` compiles this file and `ScopedCalendarReviewProvider.java:11-13` builds on its nested `Provider` and `FIRST`. Upstream has no test of `selectScopedDeletion` (`grep -r selectScopedDeletion vendor/eliza` hits only the source). Callers/importers: `test/scoped-calendar-snapshot.test.mjs`, `specs/quint/refinement/native/scoped-calendar-review-platform.mjs:171`, `ScopedCalendarReviewProvider.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-23 | B3, D8 | The in-memory `Provider` imitates SQL by parsing `where.startsWith("(")` and positional args (line 14, 600+ chars). It returns the rows the fixture expects, not the rows a provider would. `SqliteCalendarProvider` exists to replace exactly this. | Port the `main` cases to the `Sqlite` subclass (as `foreignException` already does), then delete `Provider`. | Medium: Quint harness depends on `Provider`; port it in the same change. |
| 2 | 8, 4 | D7 | A formal harness imports a test fixture's nested class and constant. | Move the provider into its own fixture file (`test/fixtures/scoped-calendar-jvm/`) that both import. | Low |
| 3 | 1-67 | T5 | Tests unmodified upstream code (`android/upstream-native-sources.json` has zero patches). | D14 follow-up: move the test to `vendor/eliza/plugins/plugin-native-calendar/test/jvm`. Keep here until then. | — |
| 4 | 48-64 | D8 | Every scenario on one line; bare `AssertionError()` (line 5). | Name each scenario; add messages. | — |

## Proposed end state
One scenario per method over `SqliteCalendarProvider`; no SQL-emulating map provider; the Quint harness uses
the shared SQLite provider. Lives in the Gradle `calendar` JVM suite (or upstream, D14).
