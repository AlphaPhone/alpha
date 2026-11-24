# android/app/src/main/java/ai/alphacompute/alphaphone/ResidentCredentialShutdownRetry.java
- Lines: 21 | Role: bounded wait loop confirming a strict resident shutdown (acknowledged + process absent) under an owner guard | Verdict: SIMPLIFY
- Importers: `AlphaLocalAgentPlugin:714-718` (one call). Text/path pins: `test/fixtures/ResidentCredentialShutdownRetryTest.java` + `test/resident-credential-shutdown-retry.test.mjs` (javac + slices `AlphaLocalAgentPlugin`), `specs/quint/native/manifest.json`, `specs/quint/native/README.md`, `specs/quint/services/manifest.json`, `specs/quint/refinement/native/resident-coordinator.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | C1 / D7 (P1) | Four single-use functional interfaces (`Guard`, `Probe`, `Clock`, `Pause`) for one call site that passes lambdas, `SystemClock::elapsedRealtime`, `Thread::sleep`. | Use the shared `Guard`, `java.util.concurrent.Callable<Boolean>` (or a `BooleanSupplier`-with-throws shared type) and `LongSupplier`; keep the `Pause` seam only while the host test needs a fake sleeper. | Low. |
| 2 | 1-21 | MERGE | Single-caller helper of the resident lifecycle. | Move into the extracted `ResidentLifecycle` class (research §5) when `AlphaLocalAgentPlugin` is split. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Guard` | interface | 5 | 7 "check() throws" guards | shared `Guard` |
| `Probe`, `Clock`, `Pause` | interface | 6-8 | JDK `Callable`, `LongSupplier` | JDK types |
| `await` | helper | 9-20 | — | `ResidentLifecycle` |

## Proposed end state
~14 lines (or a private method of `ResidentLifecycle`); same loop and 50 ms poll.

## Verification
`test/resident-credential-shutdown-retry.test.mjs`, `ResidentServiceInstrumentedTest`, Quint resident-coordinator refinement.
