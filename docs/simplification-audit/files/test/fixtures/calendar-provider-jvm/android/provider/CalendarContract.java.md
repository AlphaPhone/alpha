# test/fixtures/calendar-provider-jvm/android/provider/CalendarContract.java
- Lines: 32 | Kind: fixture (Android host-JVM stub) | Verdict: KEEP; MERGE the other two CalendarContract copies into it
- Covers: platform CalendarContract column names/constants so the pinned upstream `SelectedCalendarReader` builds the same SQL CalendarProvider would receive. Duplicates: `vendor/eliza/plugins/plugin-native-calendar/test/jvm/android/provider/CalendarContract.java` (subset, and its `Instances.ALL_DAY` is `"all_day"` where the platform constant is `"allDay"`), and an inline third copy written as a string at `test/fixtures/calendar-sync-snapshot-jvm.mjs:15` (adds `ExtendedProperties`). Callers/importers: `test/calendar-availability-reader.test.mjs:20` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | C4/C5 | Three CalendarContract stand-ins for one platform class. | Add `ExtendedProperties.CONTENT_URI` here and have `calendar-sync-snapshot-jvm.mjs` compile this file instead of writing its inline string. | Low: compile-only. |
| 2 | 21 (vendor) | - | Upstream stub has `ALL_DAY="all_day"`; platform value is `allDay`. Upstream follow-up (D14), not fixable here. | Report upstream. | Low |

## Proposed end state
One `android/provider/CalendarContract.java` in the merged stub set, used by the availability-reader and sync-snapshot JVM tests (both KEEP per research, Gradle android-jvm/calendar). Delete the inline string in `calendar-sync-snapshot-jvm.mjs`.
