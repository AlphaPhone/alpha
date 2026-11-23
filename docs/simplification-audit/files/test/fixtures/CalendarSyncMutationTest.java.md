# test/fixtures/CalendarSyncMutationTest.java
- Lines: 24 | Kind: Java fixture, integration of `CalendarSyncSnapshot` + `CalendarSyncMutation` over the in-memory provider of `CalendarSyncSnapshotTest` and the scoped-calendar content stubs | Verdict: KEEP, MOVE to the Gradle JVM calendar suite (merge with `CalendarSyncSnapshotTest.java`)
- Covers: conditional mutation plans touch only the changed rows (title, attendee optional flag, recurrence, guests removed, all-day to timed) and preserve alerts, RSVP and private properties; stale revisions, conference data, EXRULE and exception families are refused. Duplicates: device `CalendarSyncProviderInstrumentedTest` (real provider, fewer cases). Callers/importers: `test/calendar-sync-mutation.test.mjs:14`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | coupling | Depends on `CalendarSyncSnapshotTest.Provider`/`read`/`row`: the two fixtures are one suite already. | Merge both into one `CalendarSyncTest` class. | Low |
| 2 | 11-20 | D8 | Each line holds many statements and checks without messages (`check(boolean)` only). | Split into named test methods with messages on move. | Low |

## Proposed end state
One Gradle JVM `CalendarSyncTest` with snapshot and mutation-plan methods sharing the provider fixture. Importer and
this fixture deleted from `test/`.
