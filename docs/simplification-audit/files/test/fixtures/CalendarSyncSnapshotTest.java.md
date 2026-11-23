# test/fixtures/CalendarSyncSnapshotTest.java
- Lines: 84 | Kind: Java fixture, integration (`CalendarSyncSnapshot` against an in-memory `ContentResolver` and against `SqliteCalendarProvider`, whose selections run as real SQL) and shared provider fixture | Verdict: KEEP, MOVE to the Gradle JVM calendar suite (as the base of `CalendarSyncTest`)
- Covers: owned-calendar snapshots: stable revisions, child-row changes change the revision, tombstones, compare-and-swap assertions select exactly the expected rows, foreign/regenerated/orphan/oversized sources are refused, ISO duration parsing, timed and all-day projection. Duplicates: none on the host. Callers/importers: `test/calendar-sync-mutation.test.mjs:14`, `test/fixtures/calendar-sync-snapshot-jvm.mjs:16` (used by `test/calendar-sync-snapshot.test.mjs`), and the Quint harness `specs/quint/refinement/native/calendar-sync-enable-platform.mjs:213`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | importers | T10 / coupling | The Quint refinement compiles this file by path. Moving it to `android/app/src/test` breaks the harness unless its path list follows. | Move both together; the harness compiles from the new path (or from Gradle's test classes). | Medium |
| 2 | 9-25 | C4 | A second hand-written `ContentResolver` beside `SqliteCalendarProvider`; the SQL stand-in already covers the same queries. | Keep only the SQL provider once the in-memory-only cases (null cursor per table, Instances never queried) are expressed on it. | Low |
| 3 | 45-46 | D8 | 300-character lines with many checks and no messages. | Split into named test methods on move. | Low |
| 4 | 81-82 | B5 | Prints `timedRow` after PASS for a caller to parse. | Check whether `calendar-sync-snapshot-jvm.mjs` consumes it; if not, drop the print. | Low |

## Proposed end state
Base of the Gradle `CalendarSyncTest` (snapshot methods plus the mutation methods from `CalendarSyncMutationTest`),
one provider fixture, Quint harness pointed at the new path. `calendar-sync-snapshot-jvm.mjs` and the node wrappers deleted.
