# android/app/src/main/java/ai/alphacompute/alphaphone/ResidentScheduleRearm.java
- Lines: 60 | Role: pure decision table for restarting the resident after boot/package-replaced/time/timezone broadcasts, plus the lock-held admit-and-start | Verdict: SIMPLIFY
- Importers: `ResidentScheduleReceiver` (3), `AlphaLocalAgentPlugin:202-203` (`admitAndStart`). Text/path pins: `test/fixtures/ResidentScheduleRearmTest.java` (13 refs), `test/digest-missed-run-now.test.mjs`, `specs/quint/native/{ResidentScheduling.qnt,ResidentSchedulingServiceAdmission.qnt,conformance.mjs,manifest.json,README.md}`, `specs/quint/refinement/native/{FinitePolicyTraces,ResidentCoordinatorTraces,ResidentScheduleAdmissionTraces,ResidentStartCancelReplay}.java`, `index.mjs`, `resident-coordinator.mjs`, `resident-scheduling-service-admission.mjs`, `README.md`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-17 | D7 | Re-declares `Intent.ACTION_BOOT_COMPLETED`, `ACTION_MY_PACKAGE_REPLACED`, `ACTION_TIME_CHANGED`'s string, `ACTION_TIMEZONE_CHANGED` so the class stays Android-free for plain-JVM tests ("No Android imports"). | Use `android.content.Intent` constants when the plain-JVM test retires. | Low. |
| 2 | 3-12, 19-32 | A8 | 10-line class Javadoc ("#394", "was not exercised by this policy's tests") and per-enum docs restate the receiver's Javadoc. | Keep one short Javadoc (receiver or here, not both). | None. |
| 3 | 36-38 / Receiver 21 | B4 | `handles(action)` checked in the receiver and again inside `decide` (IGNORE). | Fine as a cheap early return; drop the IGNORE branch only if the receiver remains the sole entry (the plugin path also passes the action — keep). | — |
| 4 | 44-50 | D10 | `admitAndStart(lock, …, BooleanSupplier, Runnable)` is generic plumbing for the single call in `AlphaLocalAgentPlugin`. | Inline into `AlphaLocalAgentPlugin.startResidentIfAdmissible` (or the future `ResidentLifecycle`), keep `decide` as the table. | Low; Quint traces call `admitAndStart`. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Decision` | enum | 19-32 | — | here |
| action constants | const | 14-17 | `android.content.Intent.ACTION_*`; manifest intent filters | Android constants |

## Proposed end state
~35 lines: `Decision`, `handles`, `decide`; admission lock lives with the resident lifecycle.

## Verification
`test/fixtures/ResidentScheduleRearmTest.java` via its runner, Quint `ResidentScheduling*` conformance, reboot/package-replaced instrumentation.
