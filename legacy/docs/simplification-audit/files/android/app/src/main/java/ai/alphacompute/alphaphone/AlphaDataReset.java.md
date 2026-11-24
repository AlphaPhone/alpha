# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaDataReset.java
- Lines: 24 | Role: Alpha's registration of the shared reset coordinator: marker prefix, recovery activity/process, before-dispatch step, and the user-visible reset copy. | Verdict: KEEP
- Importers: `AlphaApplication` (`RESET` x2), `ResetRecoveryActivity`, `AlphaSystemPlugin`/settings reset entry (`RESET` 19 refs, `COPY` 2 refs across android). Text/path pins: `specs/quint/native/manifest.json:318,545`, `specs/quint/refinement/native/{ResetAdmissionRegression.java,ResetOrchestrationTraces.java,gmail-background-platform.mjs,reset-orchestration.mjs}`, `test/connection-routes.test.mjs`, `test/gmail-background-lock-contention.test.mjs`, `test/reset-startup.test.mjs`, `test/reset-wiring.test.mjs`, `test/support/feature-parity.mjs`; androidTest `ResetExternalFixtureInstrumentedTest`, `ResetPolicyInstrumentedTest`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-15 | A8 | "an interrupted reset from an earlier build must still resume, so they never change" — the names are simply the current persisted identifiers. | Reword to "Persisted marker names; never rename." | None |
| 2 | 10-11 | A8 | "issue #409" in Javadoc. | Drop the issue number. | None |
| 3 | 20-22 | — | User-visible copy; keep byte-for-byte. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `RESET` | const | 16-18 | — | here |
| `COPY` | const | 19-22 | — | here |

## Proposed end state
Unchanged except two comment edits (~23 lines).

## Verification
`test/reset-startup.test.mjs`, `test/reset-wiring.test.mjs`, `ResetPolicyInstrumentedTest`, Quint reset-orchestration refinement.
