# specs/quint/refinement/native/ResetTraceHooks.java
- Lines: 27 | Kind: Quint refinement support (static observation hooks and fault switches called from the reset Android/storage ports) | Verdict: KEEP
- Covers: event stream (`write-start`, `durable-write`, `listener-result`, `android-result`, `recovery-visible`, `process-exit`, `directory-sync-failure`), fault switches `failWrite`, `crashAfterCommit`, `failDirectoryAfter`, `skipCommitFor`, and the `Interruption` error used to simulate a crash after commit. Duplicates: none.
- Callers/importers: `ResetOrchestrationTraces.java`, `ResetAdmissionRegression.java`, `reset-orchestration.mjs` (compiled list and the string-inserted hook calls in the ports).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Needed by both reset drivers. If `ResetAdmissionRegression` moves to `test/`, that test needs the same hooks. | Keep one copy beside the shared reset ports (`reset-platform.mjs`), importable from the moved test. | Low |

## Proposed end state
Unchanged content; travels with the reset ports module so both the refinement harness and the reset integration test
use it.
