# test/calendar-availability-reader.test.mjs
- Lines: 27 | Kind: integration on host JVM (javac of `CalendarZones`, `CalendarSyncFreshness`, `CalendarAvailabilityJournalResult` + upstream `SelectedCalendarReader`/`CalendarSourceIdentity` + upstream Android stubs + `test/fixtures/SqliteCalendarProvider.java`, run with sqlite3), then spawns `scripts/test-calendar-availability-provider-rows.ts` on its output | Verdict: KEEP, move to Gradle JVM test (`android/app/src/test/.../CalendarAvailabilityReaderTest.java`)
- Covers: the Android free/busy reader reads only chosen calendars, provider availability, civil all-day dates and bounds; the rows then pass the renderer parser. Duplicates: `CalendarAvailabilityInstrumentedTest` (device, 4 tests, run via `calendar-regression-runner`). Callers/importers: `npm test` glob; fixture `test/fixtures/CalendarAvailabilityReaderTest.java`, `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-21 | C3 / T9 | Inline `javac`/`java` invocation with its own mkdtemp; one of ~70 such runners. | Gradle `testDebugUnitTest` with one shared Android stub set. | Low |
| 2 | 25 | T9 | Second stage spawns a 21-line `scripts/test-*.ts` to parse the JVM's JSON through the renderer parser. | Move that check into `test/integration/calendar.test.ts` reading a committed JSON fixture of reader rows (or keep the two-step but put the script in `test/`). | Low |
| 3 | 12 | - | Needs `json`, `javac`, `sqlite3`; skips silently without them. | In Gradle the JDK is guaranteed; sqlite via the JDBC driver or keep sqlite3 shell requirement explicit. | Low |
| 4 | 180000/300000 ms | - | Long timeouts (javac of ~11 files). | Gradle compile once for all JVM tests. | - |

## Proposed end state
A Gradle JVM test class for calendar reading (shared with `calendar-range-reader`, `calendar-sync-*`) compiles the
classes once. The renderer-parser leg becomes one integration case over a fixture file. This wrapper and
`scripts/test-calendar-availability-provider-rows.ts` are deleted.
