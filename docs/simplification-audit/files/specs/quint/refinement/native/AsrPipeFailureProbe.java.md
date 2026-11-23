# specs/quint/refinement/native/AsrPipeFailureProbe.java
- Lines: 16 | Kind: orphan regression probe (host-JVM, upstream `LiveSegmentPipe`) | Verdict: DELETE
- Covers: executor rejection while the failure callback or `cancelInFlight` throws still settles `ready` and `closed`. Duplicates: `AsrPipeTraces.java` modes `rejected-callback` and `rejected-cancel` (lines 143, 72-74) drive the same path and record `ready`/`closed`/`finished`. Callers: none — `git grep AsrPipeFailureProbe` (excluding vendor/docs) hits only this file; `asr-pipe.mjs` compiles `AsrPipeTraces.java` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | Unreferenced; never compiled or run. | Delete. | None |

## Proposed end state
Deleted. The behaviour stays covered by `AsrPipeTraces` `rejected-*` scenarios.
