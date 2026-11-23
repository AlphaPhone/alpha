# specs/quint/legacy/core/check-runtime-lifecycle-refinement.mjs
- Lines: 173 | Kind: Quint refinement harness (legacy model, real AgentRuntime + PGlite) | Verdict: DELETE
- Covers: 3 schedules against `legacy/CoreRuntimeLifecycle.qnt`: failed core initialization releases eager service waiters without starting, strict shutdown drains the active and already-queued turn, room admission refused after stop. Duplicates: `refinement/services/core-runtime/shutdown.mjs` (live `CoreRuntimeShutdown`: "strict callers share a stable promise", "a running room owns completion after its signal is aborted", "ordinary stop drains ...", 12 scenarios) and `core-runtime/lifecycle.mjs`/`turns.mjs` (`CoreServiceLifecycle`, `CoreTurnControllers`). Callers/importers: `specs/quint/refinement/legacy/index.mjs:20`, `test/quint-core-runtime-lifecycle-refinement.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 105-163 | T4 | Strict shutdown and closed-admission schedules overlap `core-runtime/shutdown.mjs`. | Delete. | Low. Before deleting, confirm shutdown.mjs has a "queued waiter enters with aborted signal" case; if not, add that one schedule there. |
| 2 | 81-104 | §2.9 | Failed-initialization eager-wait release is upstream-only `AgentRuntime.initialize` behaviour. | Delete; upstream follow-up. | Low. |
| 3 | 8 | — | Hashes upstream `runtime-lifecycle-model.test.ts` as a witness input it never runs. | Gone. | None. |
| 4 | 23-35 | — | Reads private `initResolver`, `initializationFailed`, `turnControllers.closedReason`, `retirement.failures`. | Gone. | None. |

## Proposed end state
Delete harness, `legacy/CoreRuntimeLifecycle.qnt` + manifest entry, index row and `test/quint-core-runtime-lifecycle-refinement.test.mjs`; carry at most the queued-waiter-after-strict-stop schedule into `core-runtime/shutdown.mjs` if it is missing there.
