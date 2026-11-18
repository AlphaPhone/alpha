# test/calendar-sync-snapshot.test.mjs
- Lines: 9 | Kind: host-JVM integration (via `test/fixtures/calendar-sync-snapshot-jvm.mjs`: javac `CalendarSyncSnapshot` + `SqliteCalendarProvider` stand-in + sqlite3) | Verdict: KEEP, move to Gradle JVM test
- Covers: native sync snapshots read exactly the owned rows, tombstones and conditional dependencies; a timed event is not all-day. Duplicates: none. Callers/importers: `npm test` glob; `calendar-sync-snapshot-jvm.mjs` is imported only by this file.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-9 | T9 | The JVM runner lives in a fixture module used once. | Fold into the Gradle calendar-sync class; delete `calendar-sync-snapshot-jvm.mjs`. | None |
| 2 | 8 | - | Second output line parsed as JSON for one boolean. | Assert inside the Java test. | None |

## Proposed end state
`CalendarSyncSnapshotTest` runs under Gradle next to the mutation, consent and receipt tests; this wrapper and its
fixture runner are deleted.
