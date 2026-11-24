# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarAvailabilityJournalResult.java
- Lines: 63 | Role: Journal policy that admits only an exact free/busy result for a foreground availability operation. | Verdict: KEEP
- Importers: `AlphaActionJournal`. Text/path pins: `specs/quint/refinement/native/{action-recovery-platform,clock-review-platform}.mjs`; `test/calendar-availability-reader.test.mjs` + `test/fixtures/CalendarAvailabilityReaderTest.java` (javac); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-62 | B3 | Strict structural validation of a result the renderer submits to the journal. | Keep: renderer->native is a trust boundary and the PRD forbids journaling calendar content. | none |
| 2 | 21-30 | C3 | `whole(...)` integer check twin of `ClockAgentReview.integer` / `DailyAppsPlugin.clockInteger`. | Optional shared `Json.wholeNumber(value,min,max)` in a util class. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| whole | helper | 21-26 | ClockAgentReview.integer:45-47, DailyAppsPlugin.clockInteger:81-86 | util Json |
| INSTANT | const | 18 | none | stay |

## Proposed end state
Unchanged; ~60 lines if integer helper is shared. Estimated lines after: 60.

## Verification
`test/calendar-availability-reader.test.mjs`.
