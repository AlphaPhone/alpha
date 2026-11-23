# android/app/src/main/java/ai/alphacompute/alphaphone/ResidentScheduleReceiver.java
- Lines: 34 | Role: manifest broadcast receiver that restarts the resident after boot, update or clock change when admissible | Verdict: KEEP
- Importers: manifest. Text/path pins: `test/digest-missed-run-now.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{ResidentScheduleAdmissionTraces.java,resident-scheduling-service-admission.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24, 27 | D3 (P2) | Calls static `AlphaLocalAgentPlugin.runtimePackaged` / `startResidentIfAdmissible` — plugin used as a service locator. | Call the extracted `ResidentLifecycle` once it exists. | Low. |
| 2 | 29-32 | B1 | `catch(RuntimeException deferred)` logs class name — specified (background-start refusal). | Keep. | — |
| 3 | 9-15 | A8 | Javadoc duplicates `ResidentScheduleRearm`'s (incl. "#394"). | Keep one. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `TAG` | const | 17 | — | here |

## Proposed end state
~28 lines, same behaviour.

## Verification
Boot/update instrumentation; `test/digest-missed-run-now.test.mjs`.
