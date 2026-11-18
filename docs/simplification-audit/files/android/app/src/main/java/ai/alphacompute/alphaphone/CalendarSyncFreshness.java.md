# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncFreshness.java
- Lines: 49 | Role: Freshness gate (device-local calendars only) in front of the upstream availability read. | Verdict: KEEP
- Importers: `AlphaCalendarPlugin`. Text/path pins: `specs/quint/services/manifest.json`; `test/calendar-availability-reader.test.mjs` + `test/fixtures/CalendarAvailabilityReaderTest.java` (javac); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-20 | D7 | "kept free of Capacitor so the host JVM test runs this exact order". | Drop the test-shape sentence when host tests are retired. | none |
| 2 | 28 | - | `requireLocal` has no caller outside this file. | Make it private. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| FreshnessUnknown | exception | 24 | - | stay |

## Proposed end state
Unchanged; ~47 lines. Estimated lines after: 47.

## Verification
`test/calendar-availability-reader.test.mjs`, androidTest `CalendarAvailabilityInstrumentedTest`.
