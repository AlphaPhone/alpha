# test/fixtures/CalendarListWindowTest.java
- Lines: 83 | Kind: Java fixture for a host-JVM run of upstream `CalendarReadAccess` with Alpha's `CONFIGURATION` copied by regex out of `AlphaCalendarPlugin.java` (T2) | Verdict: DELETE (with `test/calendar-range-reader.test.mjs`)
- Covers: the shared list returns at most 2,000 instances, reports truncation, reads creation links only for this package and refuses a range over 370 days. Duplicates: androidTest `CalendarTruncationInstrumentedTest` (named by the importer as the provider/rendered-warning check). Callers/importers: `test/calendar-range-reader.test.mjs:28` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | importer 18-22 | T2 | The importer regex-extracts `static final CalendarConfiguration CONFIGURATION=(new CalendarConfiguration(...))` and writes a generated class. | Delete. | Low |
| 2 | 51-53 | T1 | Asserts `maximumReadEvents==2000`, the journal name and the creation prefix: constants. | Delete. | Low |
| 3 | 55-78 | T5 | Truncation, link-package and range rules are upstream `CalendarReadAccess` behaviour. | Upstream follow-up if not already tested there. | Low |

## Proposed end state
Fixture and importer deleted. Truncation stays covered on device by `CalendarTruncationInstrumentedTest` and in the
Calendar journey (warning shown for a long result). If a host check of Alpha's configuration is wanted, it is one
case in the Gradle calendar suite that reads `AlphaCalendarPlugin.CONFIGURATION` directly (Gradle has Capacitor).
