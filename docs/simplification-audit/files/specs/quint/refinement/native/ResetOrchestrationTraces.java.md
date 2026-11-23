# specs/quint/refinement/native/ResetOrchestrationTraces.java
- Lines: 246 | Kind: Quint refinement harness (real `AlphaDataReset`, `AlphaApplication`, staged upstream `DataReset`, `DataResetCopy`, `ResetAuthorization` against Android/storage ports with observation hooks) | Verdict: PORT (port source; harness KEEP)
- Covers: live model `ResetRecovery` (native manifest): Activity-bound reset approval (begin/confirm/authenticate/retire), durable pending marker and failure budget, listener-first reset, bounded automatic retries at startup, recovery surface instead of a restart loop, Android `clearApplicationUserData` accepted/refused/thrown, directory-sync failure after commit, uncommitted replacement, unreadable budget. 20 traces. Duplicates: `ResetAdmissionRegression` (MOVE) overlaps six scenarios; `test/reset-startup.test.mjs` test 1 covers the startup sequence; `ComponentTraces` covers `ResetAuthorization` alone. Runs only in the aggregate (`index.mjs:181-186`), each trace checked as its own receipt.
- Callers/importers: `reset-orchestration.mjs` (`generateResetOrchestrationTraces`, `checkResetOrchestration`).

## How it is tied to product code
- Whole-file compile of the product and staged upstream reset classes (no slicing of product source).
- **Cross-test text coupling (T10)**: `reset-orchestration.mjs:16-32` regex-extracts 18 Android port sources from template literals inside `test/reset-startup.test.mjs` (`put('<path>',\`...\`)`), evaluates them with `vm.runInNewContext`, asserts the count is 18, then string-replaces five port bodies (`calls++;return resetSaved;`, `recoveries++;`, `throw new Exit();`, the exact `clearApplicationUserData` body, the exact `Os.open` body) to insert `ResetTraceHooks` calls. The `test/reset-startup.test.mjs` report proposes MERGE into Gradle and DELETE of its source-text test, which would break this harness.
- Reflection: `ResetAuthorization.active`, `confirmed`, `generation`. Uses `AlphaDataReset.RESET.failureState/pending/record/retry/automaticAttempt`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | runner 16-48 | T10 | Ports are parsed out of another test file and patched by exact string replacement. | Move the 18 ports (with the hooks already inserted) into `refinement/native/reset-platform.mjs`, generated like every other platform; `test/reset-startup` (or its Gradle successor) stops being an input. Must land before or with the reset-startup MERGE. | Medium: ordering dependency with the test cleanup. |
| 2 | runner 105-131 | B5 | Writes `reset-orchestration-source-traces.json` and `reset-orchestration-summary.json` into `test-results/`, catches per-trace failures to build a status table, and records `fixturePortSha256`. | Let a mismatch throw; drop the extra files and the per-trace receipt bookkeeping. | Low |
| 3 | 172-243 | D9 | `main` is a long sequence of scenario blocks with inline loops; acceptable. | None. | None |
| 4 | 214-215 | — | "Failure-budget reproduction changed" assertion is a real product check (no dispatch when the budget is unwritable). | Keep. | None |

## Proposed end state
Keep the harness and its 20 traces. Its Android ports live in a `reset-platform.mjs` beside it, not inside a host
test. The runner checks traces and throws on mismatch without extra JSON artefacts. `ResetAdmissionRegression`
moves out to the reset integration test and reuses the same ports module.
