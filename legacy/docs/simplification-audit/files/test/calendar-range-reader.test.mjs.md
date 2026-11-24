# test/calendar-range-reader.test.mjs
- Lines: 32 | Kind: host-JVM integration with a source slice (regex extracts `static final CalendarConfiguration CONFIGURATION=(new CalendarConfiguration(...))` from `AlphaCalendarPlugin.java`, writes it into a generated class, compiles it with upstream `CalendarConfiguration`/`CalendarReadAccess` and two upstream stub sets) | Verdict: KEEP, PORT to Gradle JVM test (no slicing)
- Covers: the Android Calendar list returns at most 2,000 instances, reports truncation and carries `creationId` with Alpha's configuration. Duplicates: `CalendarTruncationInstrumentedTest` (device, run by `calendar-regression-runner` "truncation" case). Callers/importers: `npm test` glob; fixture `test/fixtures/CalendarListWindowTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-22 | T10 / D7 | Regex slice of product Java because `AlphaCalendarPlugin` needs Capacitor. | Move `CONFIGURATION` to a Capacitor-free `AlphaCalendarConfiguration.java` in main source; the plugin and the test both use it. | None |
| 2 | 24-28 | C3 | Mixes two upstream stub trees (`test/jvm/android`, `test/native-host/read-window/android`). | One stub set in the Gradle test source set (or Robolectric-free plain stubs). | Low |
| 3 | 23-29 | C3 | Own javac/java invocation (180 s timeout). | Gradle. | - |
| 4 | 25 | P5 | Most of the logic under test is upstream `CalendarReadAccess`; Alpha's part is the configuration values. | Keep one case pinning Alpha's 2,000 bound and creation prefix. | Low |

## Proposed end state
A Gradle JVM test compiles the extracted `AlphaCalendarConfiguration` with the upstream reader and asserts the 2,000
bound, truncation flag and `creationId`. No regex over Java source.
