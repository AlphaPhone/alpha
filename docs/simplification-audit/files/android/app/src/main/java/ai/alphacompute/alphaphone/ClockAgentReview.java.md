# android/app/src/main/java/ai/alphacompute/alphaphone/ClockAgentReview.java
- Lines: 106 | Role: Owner-reviewed Clock hand-off for agent alarm requests (validation, review dialog, dispatch). | Verdict: SIMPLIFY
- Importers: `AlphaActionJournalPlugin`. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{ClockReviewTraces.java,clock-review-platform,clock-review}.mjs`; `test/clock-native-contract.test.mjs` (source text); androidTest `ClockRepeatDaysInstrumentedTest`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 45-47 | C3 | `integer(object,key,min,max)` whole-number check; twins `DailyAppsPlugin.clockInteger:81-86`, `CalendarAvailabilityJournalResult.whole:21-26`. | Shared `Json.wholeNumber`. | none |
| 2 | 48-51 | C4 | `foreground(Activity)` owner check uses `isKeyguardLocked` while Calendar uses `isDeviceLocked`. | Shared `OwnerSurface` with an explicit keyguard-vs-device-lock choice. | medium |
| 3 | 31, 33, 34, 37-39, 46 | B1/D8 | `throw new IllegalArgumentException()` with no message (7×), later mapped to "failed". | Give each a message (debuggability; wire result unchanged). | none |
| 4 | 105 | D8 | Catch ladder on one line. | Formatter. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Open | class | 20 | - | stay |
| Decision | interface | 22 | - | stay |
| integer | helper | 45-47 | DailyAppsPlugin.clockInteger, CalendarAvailabilityJournalResult.whole | Json util |
| foreground | helper | 48-51 | OwnerSurface copies | OwnerSurface |
| result | helper | 24 | status() builders | stay |

## Proposed end state
Same behaviour; shared helpers; ~98 lines. Estimated lines after: 98.

## Verification
`test/clock-native-contract.test.mjs`, Quint clock-review, androidTest ClockRepeatDays.
