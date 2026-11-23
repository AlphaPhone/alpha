# specs/quint/refinement/services/prepared-workflow-worker.mjs
- Lines: 189 | Kind: Quint refinement driver (imports real `ensurePreparedWorkflowWorker` and `verifyWorkerArtifact`; closed synthetic producer `test/fixtures/prepared-worker-producer.mjs`) | Verdict: KEEP
- Covers: `PreparedWorkflowWorker` (live, `manifest.json:2945`): build then exact reuse; stale stamp/lock, changed worker/required-package bytes, unexpected file and malformed manifest refuse reuse; stamp/lock drift during build refused; partial output retained and refused; failure before output permits retry; fresh directory preserves interrupted output. Duplicates: `test/prepared-workflow-worker.test.mjs` (MERGE into `test/tooling/android-build.test.mjs`) covers build/stage basics. Callers: `services/index.mjs:64,85`; `test/quint-prepared-workflow-worker.test.mjs` (also imports `waitForPreparedWorkerProducer`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 45-58 | T5 | `waitForPreparedWorkerProducer` is exported so the host test can test the harness's own timeout path. A test of test machinery. | Make private; drop that host-test case. | Low |
| 2 | 14, 70, 127 | D3 | Producer ports passed through `globalThis[Symbol.for('alpha.quint.preparedWorkerPorts')]` because the upstream producer is loaded by path. Acceptable for a closed producer. | Keep. | — |
| 3 | 23-37 | C3 | Private recursive directory walker + digest (one of 11 walkers). | Shared walker in `refinement/support.mjs`. | Low |
| 4 | 39-43 | C3 | Private `deferred()`. | Shared helper. | Low |
| 5 | 102-112 | B1 | `catch (error) {assert.ok(error instanceof SyntaxError);}` and `catch (error) {assert.ok(error instanceof Error);}` classify malformed/invalid manifests: these are the observations, fine; the second could assert a specific message/code. | Optional tighten. | Low |

## Proposed end state
Unchanged import-based campaign with shared helpers; private wait helper; path filter on
`scripts/prepared-workflow-worker.ts`, `scripts/workflow-worker-artifact.ts`, `scripts/build-workflow-worker.ts`.
