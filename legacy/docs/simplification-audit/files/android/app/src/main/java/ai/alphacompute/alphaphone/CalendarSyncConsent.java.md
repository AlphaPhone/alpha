# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncConsent.java
- Lines: 43 | Role: Pure check that a Calendar sync write through the connection transport matches the native consent binding. | Verdict: KEEP
- Importers: `AlphaConnectionPlugin`. Text/path pins: `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`; `specs/quint/refinement/native/{CalendarSyncEnableTraces.java,calendar-sync-enable,credential-coordinator}.mjs`; `test/calendar-sync-consent.test.mjs` + `test/fixtures/CalendarSyncConsentTest.java` (javac); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | D7 | "Pure (org.json only) so it is tested without Android." | Comment can go; class is fine as a pure policy. | none |
| 2 | 27 | B1 | `catch(Exception invalid){return false;}` | Fail-closed admission is the specified behaviour; keep. | none |
| 3 | 33-42 | C3 | Hand-written query-string parser with repeated-key refusal. | Keep (strict duplicate refusal is the point). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| EVENT_PATH | const | 12 | CloudConnectionPolicy.calendarSync route (upstream) | stay |

## Proposed end state
Unchanged; 42 lines. Estimated lines after: 42.

## Verification
`test/calendar-sync-consent.test.mjs`.
