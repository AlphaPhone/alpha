# test/fixtures/CalendarSyncConsentTest.java
- Lines: 39 | Kind: Java fixture, single-class unit (`CalendarSyncConsent.admits` only) | Verdict: MERGE into the Gradle JVM calendar suite
- Covers: native consent gate for Google Calendar sync writes: reads always pass, POST/PATCH/DELETE need enabled consent bound to the same grant, calendar and account; repeated parameters, unknown versions and corrupt consent refuse. Duplicates: none. Callers/importers: `test/calendar-sync-consent.test.mjs:9`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 | One pure function with a table of inputs. Kept only because it is a security gate on a production path (`AlphaConnectionPlugin` calls it; D18 keeps the native Calendar sync). | Fold into the calendar suite as one table-driven test. | Medium if deleted |
| 2 | 6 | test design | Home-made `check`; JUnit asserts replace it in Gradle. | Rewrite assertions on move. | Low |

## Proposed end state
A table-driven JUnit method `consentAdmitsOnlyBoundEnabledWrites` in the calendar suite. `test/calendar-sync-consent.test.mjs`
and this fixture deleted. Re-check if the owner answers Q-CAL-1 (Android Calendar sync) with "delete".
