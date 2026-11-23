# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarZones.java
- Lines: 13 | Role: One helper: whether a requested zone id has the same rules as the device zone. | Verdict: MERGE into android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCalendarPlugin.java
- Importers: `AlphaCalendarPlugin.java:123,139`; androidTest `CalendarAvailabilityInstrumentedTest:161-165`; host `test/fixtures/CalendarAvailabilityReaderTest.java:266-267`. Text/path pins: `test/calendar-availability-reader.test.mjs` (compiles this file); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | D7 | A class for a single 1-line method, kept separate so host javac can compile it without Capacitor. | Inline as a private static method in `AlphaCalendarPlugin`; drop the host-javac assertions (androidTest already covers aliases). | low |
| 2 | 11 | B1 | `catch(Exception invalid){return false;}` | Narrow to `DateTimeException` (ZoneId.of's documented failure). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| sameZone | helper | 10-12 | ClockAgentReview.zone:52-56 (ICU canonical id comparison, different rule) | AlphaCalendarPlugin |

## Proposed end state
File removed; 3-line private method in AlphaCalendarPlugin. Estimated lines after: 0.

## Verification
androidTest `CalendarAvailabilityInstrumentedTest`; update `test/calendar-availability-reader.test.mjs` and the fixture.
