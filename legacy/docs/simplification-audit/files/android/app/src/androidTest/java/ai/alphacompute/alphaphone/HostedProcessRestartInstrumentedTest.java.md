# android/app/src/androidTest/java/ai/alphacompute/alphaphone/HostedProcessRestartInstrumentedTest.java
- Lines: 80 | Role: three separate instrumentation processes: commit a hosted result whose ACK response is lost, resume after process death and ACK exactly once, verify after a second restart and clean up. | Verdict: SIMPLIFY (or DELETE with P15)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:163-167` (`phases: ["prepareCommittedResultWithLostAck", "resumeAfterProcessDeathRecoversAckOnce", "verifySecondRestartAndCleanup"]`, args `alphaHostedProcessRestartFixture`); `test/android-instrumentation-runner.test.mjs:95` (3 phases), `:433-473` (reads source for `isSystemUser()`, run-plan per phase); `scripts/owner/emulator-campaign-check.ts:43,59`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35, 41 | A3 (P15/P16) | Same paired-agent binding (`authSlot="remote:"+origin`, binding with `origin/ownerId/agentId`) as HostedBackgroundWorker | Decide with P15 (keep both or delete both) | High coupling |
| 2 | 67-79 | C5 | Near-identical `Fixture` to HostedBackgroundWorker:67-79 (adds `loseAck`, fixed port re-bind) | Shared `HostedAgentFixture` | Low |
| 3 | 22 | D8 / D10 | `context()` does three things on one line: assumption gate, test-mocks assertion, secondary-user assertion | Split into `gate()` + `requireDisposableTestMocksUser()`; the `isSystemUser()` text must remain in the file (runner pin) | Low |
| 4 | 27, 37 | D11 | `"legacy-worker-client"` fixture id (not a legacy format) | Rename with HostedBackgroundWorker | None |
| 5 | 53-54 | C3 | WorkManager poll loop | `WorkTestDriver.awaitFinished` | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `STATE`, `SESSION` | const | 21 | none | keep (multi-process checkpoint slot) |
| `cipher`/`retained` | helper | 23-29 | HostedBackgroundWorker.read:66 | keep `retained`; `TestFiles.readAll` |
| `Fixture` | class | 67-79 | HostedBackgroundWorker.Fixture | `HostedAgentFixture` |

## Proposed end state
Same three phase method names (pinned). Shared fixture, WorkManager helper, split `context()`. Estimated 80 -> ~50 lines.
Delete together with HostedBackgroundWorker if P15 removes paired/local-origin hosted delivery.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --test-mocks --classes HostedProcessRestart` (three phases in a
secondary user); `node --test test/android-instrumentation-runner.test.mjs test/owner-emulator-campaign-check.test.mjs`.
