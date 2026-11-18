# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarCreationStore.java
- Lines: 13 | Role: Static facade forwarding to the upstream `CalendarCreationStore` with Alpha's configuration. | Verdict: DELETE
- Importers: `AlphaCalendarPlugin.java:97` (`pendingCreations` only); androidTest `CalendarCreationRecoveryInstrumentedTest` (`create`, `pendingCreations`), `CalendarUpgradeInstrumentedTest`. Text/path pins: `specs/quint/application/manifest.json:5857` pins the *upstream* file, not this one; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-13 | D4/D7 | "Compatibility entrypoint for installed-state acceptance tests" - three one-line forwards; `create` and `acknowledge` have no production caller. | Delete. `AlphaCalendarPlugin` holds `new ai.eliza.plugins.calendar.CalendarCreationStore(CONFIGURATION)` (or uses the one its upstream base already owns) and the two instrumentation tests construct the upstream store themselves. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| STORE | const | 9 | upstream store instance inside CalendarPlugin base (likely) | AlphaCalendarPlugin |

## Proposed end state
File removed. Estimated lines after: 0.

## Verification
androidTest `CalendarCreationRecoveryInstrumentedTest`, `CalendarUpgradeInstrumentedTest` (update imports).
