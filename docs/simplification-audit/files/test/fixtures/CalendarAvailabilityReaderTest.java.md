# test/fixtures/CalendarAvailabilityReaderTest.java
- Lines: 320 | Kind: Java fixture for an integration run (javac of Alpha `CalendarZones`, `CalendarSyncFreshness`, `CalendarAvailabilityJournalResult` with upstream `SelectedCalendarReader`/`CalendarSourceIdentity`, upstream JVM Android stubs, `SqliteCalendarProvider.java`; provider queries executed by the `sqlite3` shell) | Verdict: KEEP, MOVE to the Gradle JVM calendar suite (`android/app/src/test/java/.../CalendarSuite`)
- Covers: free/busy reads return only chosen calendars, provider availability, civil all-day dates and window bounds, never event content; Alpha's freshness gate refuses remote caches; revisions bind the read. Duplicates: none on the host; device `CalendarSyncProviderInstrumentedTest` is a different path. Callers/importers: `test/calendar-availability-reader.test.mjs:20` (javac list), which pipes the printed cases into `scripts/test-calendar-availability-provider-rows.ts` (renderer parser round trip).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-34, most of main | T5 | Most assertions exercise upstream `SelectedCalendarReader` (projection, selection, malformed selections, 7-day window, 16-calendar cap). Lines ~126-128 note an upstream follow-up (no `calendar_access_level` check). | Keep the cases that go through Alpha's `CalendarSyncFreshness.readAvailability` and journal policy; move reader-only cases upstream (follow-up). | Medium |
| 2 | importer | T9 | The node test spawns `scripts/test-calendar-availability-provider-rows.ts` with a cases file printed on stdout line 2: a test hidden in `scripts/`. | When moved to Gradle, keep the renderer half as a case in the calendar integration file that reads a checked-in cases JSON, or drop it. | Low |
| 3 | importer | cross-file | `cross-file-actions` U-A7 merges `CalendarZones` into `AlphaCalendarPlugin`; the javac list then needs Capacitor stubs. | Do the Gradle move first (Gradle has Capacitor on the classpath), then the merge. | Medium |
| 4 | 47-57 | ok | `Provider` extends the shared `SqliteCalendarProvider` and records every Instances query to prove no content column is read. | Keep as the suite's provider fixture. | Low |

## Proposed end state
A Gradle JVM test class for the Alpha availability gate (freshness, journal policy, revision binding, content never
read), reusing `SqliteCalendarProvider` as the one provider fixture for the calendar suite. Reader-only rows go
upstream. Requires `sqlite3` on the CI image, as today.
