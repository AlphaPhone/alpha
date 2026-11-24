# test/fixtures/calendar-sync-snapshot-jvm.mjs
- Lines: 20 | Kind: JVM test runner helper (javac + java of `CalendarSyncSnapshot` with a SQLite provider stand-in) | Verdict: MERGE into `test/calendar-sync-snapshot.test.mjs` (single caller), using `runJvm` and the shared CalendarContract stub
- Covers: Android `CalendarSyncSnapshot` reads a timed event through the provider stand-in (native half of Calendar sync, kept per D18). Duplicates: compile pattern duplicates `jvm-tools.mjs` `runJvm`. Callers/importers: `test/calendar-sync-snapshot.test.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | C5 | Writes a third CalendarContract as an inline string; `test/fixtures/calendar-provider-jvm/android/provider/CalendarContract.java` is the fuller copy (lacks only `ExtendedProperties`). | Add `ExtendedProperties` there and compile that file. | Low |
| 2 | 10-19 | C3 | Own mkdtemp/javac/java/rm sequence; `runJvm` exists (research: 70 files hand-roll javac). | Use `runJvm([...files], 'ai.alphacompute.alphaphone.CalendarSyncSnapshotTest')`. | none |
| 3 | 11 | T9 | `ALPHA_NATIVE_UPSTREAM_ROOT` override: no workflow, script or package.json sets it (git grep). | Delete the knob; use `root`. | none |

## Proposed end state
Five lines inside the test via `runJvm`, the shared CalendarContract stub; file deleted. When JVM tests move to Gradle `android/app/src/test`, the test moves too.
