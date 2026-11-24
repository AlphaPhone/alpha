# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncMutation.java
- Lines: 89 | Role: Builds the conditional CalendarProvider operation plan for a linked-event edit and normalizes events for comparison. | Verdict: SIMPLIFY
- Importers: `CalendarSyncBridge`. Text/path pins: `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`; `specs/quint/refinement/native/calendar-sync-enable.mjs`; `test/calendar-sync-mutation.test.mjs` + `test/fixtures/CalendarSyncMutationTest.java` (javac); androidTest `CalendarSyncProviderInstrumentedTest`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 72 | C6 | Email regex `[^\\s@,;<>]+@[^\\s@,;<>]+\\.[^\\s@,;<>]+` duplicated in `CalendarSyncSnapshot.java:88`. | Shared constant `CalendarSyncSnapshot.EMAIL` (or a small `CalendarSyncRules`). | none |
| 2 | 44 | D8 | Excluded-date validation (two branches, two regexes, formatter) on one 400-char line. | Extract `validateExdate(String, boolean allDay)`. | none |
| 3 | 74-75 | D8 | Guest update/insert in one line each. | Formatter / extract. | none |
| 4 | 88 | C3 | `sameLines` sorts both arrays to compare. | Keep (tiny) or reuse `normalized` recurrence sorting. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| text / instant | helpers | 25-26 | CalendarSyncSnapshot.text (different semantics) | stay |

## Proposed end state
Same plan semantics; ~80 lines after extraction. Estimated lines after: 80.

## Verification
`test/calendar-sync-mutation.test.mjs`, androidTest CalendarSyncProvider.
