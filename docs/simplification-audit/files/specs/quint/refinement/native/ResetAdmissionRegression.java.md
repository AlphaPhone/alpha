# specs/quint/refinement/native/ResetAdmissionRegression.java
- Lines: 174 | Kind: JVM integration regression (real `AlphaDataReset`, `AlphaApplication`, staged upstream `DataReset`/`ResetAuthorization`, real file locks and child processes; not a Quint replay) | Verdict: MOVE to `test/` — MERGE into the reset integration test that replaces `test/reset-startup.test.mjs` (its report proposes Gradle `AlphaDataResetTest.java`)
- Covers: data-reset admission budget and marker durability: no authority without marker; failed preparation dispatches nothing; unwritable budget defers; post-commit directory-sync failure keeps exact committed bytes; open reservation is settled without repeating effects; silent AtomicFile non-commit detected; crash after reservation; settlement write unavailable; accepted clear is not proof of erasure; three automatic attempts then manual retry; count saturates at `Integer.MAX_VALUE`; corrupt budgets (`garbage`, `0:0:` …) defer then explicit repair; window boundary and backwards clock; durable reservation before listener/Android callback; marker removed mid-attempt; cross-process final slot reserved once; contended lock defers. Duplicates: `ResetOrchestrationTraces` scenarios `reservation-sync-failed`, `reservation-not-committed`, `failure-budget-write-unavailable`, `unreadable-budget`, `accepted-clear-marker-survives`, `same-window-explicit-retry` cover about a third against the model; `test/reset-startup.test.mjs` test 1 covers the bounded retry/recovery startup path.
- Callers/importers: `reset-orchestration.mjs:96` (`generateResetOrchestrationTraces` runs it and stores the JSON as `regressions`; a failure throws). Run only through the native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 | A behaviour test hidden inside a Quint runner; its result is only an exception or a `checks` count in a receipt. | Move to the reset integration test (one JVM test class), keeping the cases not already replayed against the model: missing marker, prepare failure per file, post-commit directory sync, crash reservation, settlement-write unavailable, exhausted/saturation, corrupt budgets, window/backwards clock, callback order, marker removed (2 cases), cross-process and contended lock. | Low |
| 2 | 120-125 | A8 (naming) | Scenario names `legacy-<corrupt>` / message "legacy invalid budget" describe corrupt input, not legacy data. | Rename to `corrupt-<value>`. | None |
| 3 | 17, 172 | B5 | `checks` counter printed as evidence. | Drop; rely on assertions. | None |
| 4 | 154-171 | T8 | 15 s / 5 s child-process waits. They are bounds, not sleeps. | None. | None |

## Proposed end state
Not in `specs/`. The non-duplicated cases live in the single reset integration test (JVM or Gradle unit-on-real-
classes), sharing the Android ports that `ResetOrchestrationTraces` uses. If the move is not done in the same change,
keep the file: deleting it alone would drop the cross-process, lock, crash and saturation coverage.
