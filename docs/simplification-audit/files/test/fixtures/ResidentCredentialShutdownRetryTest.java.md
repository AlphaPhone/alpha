# test/fixtures/ResidentCredentialShutdownRetryTest.java
- Lines: 24 | Kind: unit (fake clock, fake sleeper, lambdas for every port) | Verdict: DELETE
- Covers: `ResidentCredentialShutdownRetry.await` completes only on a later exact acknowledgment with the service absent, and fails on unknown owner, live socket, cancellation, superseded acknowledgment and interruption. Duplicates: `specs/quint/refinement/native/resident-coordinator.mjs` compiles the real `ResidentCredentialShutdownRetry.java` (line 10) into the resident coordinator trace replay; `specs/quint/native/manifest.json` and `specs/quint/services/manifest.json` pin it. Callers/importers: only `test/resident-credential-shutdown-retry.test.mjs:58-59` (test 1, whose other half is a T2 transplant of `AlphaLocalAgentPlugin` text).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-23 | T3 | One 21-line class with every collaborator faked. | Delete. | Low: the replay runs the same class under modelled interleavings. |
| 2 | 3-6 | C3 | Own `check`/`fails` helpers (one of ~60 per-fixture copies). | Goes with the file. | — |
| 3 | 10-11 | — | `checks[0]>=6` is an exact-ish count of internal polling, i.e. implementation detail. | — | — |

## Proposed end state
Deleted together with the whole `test/resident-credential-shutdown-retry.test.mjs` (its other two tests are
transplants of `AlphaLocalAgentPlugin` methods, T2). Strict-retry behaviour stays covered by the resident
coordinator Quint refinement.
