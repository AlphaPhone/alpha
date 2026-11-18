# test/scoped-calendar-snapshot.test.mjs
- Lines: 25 | Kind: JVM integration (patched upstream `CalendarEventGuard`, `CalendarSourceIdentity` with SQLite-backed `ContentResolver` fixture; `ScopedCalendarSnapshotTest.java`) | Verdict: DELETE
- Covers: a scoped Calendar snapshot binds occurrence, dependencies and one atomic provider transaction. Duplicates: `specs/quint/refinement/native/scoped-calendar-review-platform.mjs:170-171` compiles the identical file list including `ScopedCalendarSnapshotTest.java` (T4). Callers/importers: `npm test` glob; fixtures `SqliteCalendarProvider.java`, `ScopedCalendarSnapshotTest.java`, `scoped-calendar-jvm/` (all still imported by the Quint harness and `calendar-sync-enable-platform.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-25 | T4 | Same javac/java run as the scoped-calendar refinement, with a 120 s run timeout and `materializeNativePatches`. | Delete. | Low |
| 2 | 18 | T2 | String-patches an upstream `ContentValues.java` stub. | Goes with the file (the harness does the same; port there). | Low |
| 3 | 13 | T9 | `ALPHA_NATIVE_UPSTREAM_ROOT` knob. | Goes with the file. | Low |

## Proposed end state
File deleted; fixtures remain owned by the Quint native harnesses.
