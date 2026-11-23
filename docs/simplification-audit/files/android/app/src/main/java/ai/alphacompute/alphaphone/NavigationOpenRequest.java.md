# android/app/src/main/java/ai/alphacompute/alphaphone/NavigationOpenRequest.java
- Lines: 14 | Role: 30-second one-shot flag for "a Maps navigation notification tap is waiting for the renderer" | Verdict: MERGE into `MainActivity` (private static nested class)
- Importers: `MainActivity` only. Text/path pins: `test/fixtures/NavigationOpenRequestTest.java` + `test/maps-notification-open.test.mjs` (javac), `specs/quint/refinement/native/{assistant-entry,home-instance-handoff,main-activity-platform,renderer-background-rebuild}.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-14 | D7 | A tiny top-level class kept so javac can test it in isolation; its only user is the static field `MainActivity.navigationOpen`. | Nest it in `MainActivity` (or in the extracted `HomeInstanceHandoff`) when `NavigationOpenRequestTest` is retired (T3); the Quint platform files that stub it must be updated. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `LIFETIME_MS` | const | 5 | — | nested |

## Proposed end state
File removed; same 10 lines as a nested class.

## Verification
`test/maps-notification-open.test.mjs`, Maps notification-tap instrumentation (`NavigationServiceInstrumentedTest`), Quint navigation refinements.
