# test/fixtures/SqliteCalendarProvider.java
- Lines: 111 | Kind: support (host-JVM `ContentResolver` stand-in that executes each provider query through the `sqlite3` CLI over CalendarProvider-named tables) | Verdict: KEEP (move with the shared JVM stub set to the Gradle test source set later)
- Covers: nothing by itself; it makes Calendar host tests run real SQL for projections, selections, sort order and the Instances range clause, so a wrong selection returns the rows Android would. Duplicates: the hand-written map provider inside `ScopedCalendarSnapshotTest.java:8-23`, which it should replace. Callers/importers (`grep -r SqliteCalendarProvider`): `test/calendar-sync-mutation.test.mjs`, `test/calendar-availability-reader.test.mjs`, `test/scoped-calendar-snapshot.test.mjs`, `test/fixtures/calendar-sync-snapshot-jvm.mjs` (used by `test/calendar-sync-snapshot.test.mjs`), fixtures `ScopedCalendarSnapshotTest.java`, `CalendarAvailabilityReaderTest.java`, `CalendarSyncSnapshotTest.java`, and Quint harnesses `specs/quint/refinement/native/scoped-calendar-review-platform.mjs:171` and `calendar-sync-enable-platform.mjs:213`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | Survives every proposed deletion: the Quint harnesses and the Android-side Calendar sync tests (kept by D18) depend on it, and scoped deletion and availability reading are live. | Keep. | — |
| 2 | 38-45 | — | One `sqlite3` process per query and per flushed write batch; tests skip without `sqlite3` locally (`jvm-tools.mjs:35`) but never on CI. | Acceptable. If it moves to Gradle, `org.xerial:sqlite-jdbc` in `testImplementation` would drop the CLI dependency and the process cost. | Low |
| 3 | 98-103 | — | Only numeric `?` arguments are bound (inlined after a `[0-9]{1,19}` check). A future text argument fails loudly, which is the right failure. | Keep; document in the class comment (already says so in effect). | — |
| 4 | 73 | C6 | `getType` returns literal `3` for text. | Use `FIELD_TYPE_STRING` from the `Cursor` stub. | Trivial |
| 5 | 44 | B1 | `catch(RuntimeException error){throw error;}catch(Exception error){throw new IllegalStateException(error);}` — fine, wraps checked exceptions. | None. | — |

## Proposed end state
Unchanged API. Becomes the only Calendar provider stand-in (the map provider in `ScopedCalendarSnapshotTest` is
ported to it), moves with the shared Android stubs into the Gradle JVM `calendar` suite.
