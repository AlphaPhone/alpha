# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkerCrashDiagnostic.java
- Lines: 63 | Role: Test-only projection of `ApplicationExitInfo` for a crashed worker process, including a hand-written protobuf reader for Android tombstones (pid/uid/signal/seccomp syscall). | Verdict: SIMPLIFY (owner decision: DELETE)
- Importers: 1 — `ResidentWorkflowCrashInstrumentedTest.java:235` (resident campaign, `scripts/ci/resident-native.py`). Text/path pins: none (grep outside androidTest: 0).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-62 | B5 / D9 | A 25-line protobuf varint parser for `tombstone.proto` with duplicate-field rejection, used only to enrich a crash diagnostic in one test (`if(signal==31&&code==1...)result.put("seccompSyscall",...)`). Evidence ceremony for a diagnostic, not an assertion. | If `ResidentWorkflowCrashInstrumentedTest` only reports this projection, delete the trace parser (lines 30-62) and keep `reason`/`status` from `ApplicationExitInfo` (lines 22-29). Verified: `ResidentWorkflowCrashInstrumentedTest:235` only stores it as `safe.put("workerCrash", ...)` inside a failure-diagnostic snapshot (no assertion; `git grep seccompSyscall\|workerCrash -- scripts test`: 0 hits). | Medium: loses seccomp-syscall detail when diagnosing worker crashes. |
| 2 | 16-20 | B1 | `catch(Exception unavailable){pending.cancel(true);return safeUnavailable();}` swallows every failure, and runs a dedicated thread pool for a 2 s read. | Call `observe` directly; Android's `getHistoricalProcessExitReasons` is synchronous and bounded. Let errors throw (a test helper). | Low. |
| 3 | 21 | B4 | `safeUnavailable()` catches an "impossible" `JSONException`. | Inline `new JSONObject(Map.of("available",false))`. | None. |
| 4 | 39-61 | D8 | Lines up to ~600 chars. | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Cursor` | class | 56-62 | none | delete with parser |
| `LIMIT` | const | 15 | none | delete with parser |
| single-thread executor | helper (inline) | 17 | research C3: 25 thread pools in Java | delete |

## Proposed end state
~20 lines: `capture(context, identity)` returns `{available, pid, uid, reason, status, timestamp}` for the exact exit record, or `{available:false}`. Or the whole file deleted if the owner drops the crash diagnostic.

## Verification
`python3 scripts/ci/resident-native.py` phase that runs `ResidentWorkflowCrashInstrumentedTest` (disposable ARM64 emulator); androidTest compile.
