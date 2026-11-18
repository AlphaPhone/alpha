# test/calendar-sync-mutation.test.mjs
- Lines: 18 | Kind: host-JVM integration (materializes native sources via `scripts/prepare-patched-native.ts` `materializeNativePatches` and `upstream-native-source.ts`, rewrites upstream `ContentValues.java` by string replace, generates a `CalendarContract.java` from a JS string, compiles 13 files incl. product `CalendarSyncSnapshot`/`CalendarSyncMutation`) | Verdict: KEEP, move to Gradle JVM test; SIMPLIFY its setup
- Covers: conditional native Calendar mutation plans preserve alerts, RSVP and metadata and refuse unsupported mutations. Duplicates: none on host. Callers/importers: `npm test` glob; fixtures `CalendarSyncMutationTest.java`, `CalendarSyncSnapshotTest.java`, `SqliteCalendarProvider.java`, `scoped-calendar-jvm/android/content/*`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | A7 | Materialises native patches from `patches/eliza`, which no longer exists in the tree (`ls patches` fails); the manifest must be empty, so the step is a copy. | Compile upstream sources directly from `vendor/eliza`; drop the patch step and `ALPHA_NATIVE_UPSTREAM_ROOT`. | Low |
| 2 | 11 | C5 | String-patches an upstream stub (`ContentValues`) to add methods. | One local stub set with the needed methods. | None |
| 3 | 12-13 | C5 | `CalendarContract` generated from a JS string; a third copy beside `test/fixtures/calendar-provider-jvm/android/provider/CalendarContract.java` and upstream's. | One stub. | None |
| 4 | 14 | C5 | Stubs from three trees (upstream `test/jvm/android`, `test/fixtures/scoped-calendar-jvm`, generated). | One Android stub tree for all calendar JVM tests (tests-host research). | Low |

## Proposed end state
`CalendarSyncMutationTest` runs under Gradle against one stub set, compiled once with the other calendar-sync tests.
No patch materialisation, no generated Java from JS strings.
