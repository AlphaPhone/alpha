# android/app/src/androidTest/java/ai/alphacompute/alphaphone/HostedBackgroundWorkerInstrumentedTest.java
- Lines: 80 | Role: real WorkManager `HostedDeliveryWorker` against a loopback agent: receives a hosted digest result, replays without a second notice, keeps ciphertext, pause/attempt/session fences in `HostedDelivery`. Test-mocks build, secondary user. | Verdict: SIMPLIFY (or DELETE with P15)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:199` (`secondaryUser`, `requiresTestMocksBuild`, `args: { alphaHostedBackgroundFixture: "true" }`); `test/android-instrumentation-runner.test.mjs:433-441` reads this source and requires `isSystemUser()` (text pin), `:443-469` run-plan expectations by class name.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31, 39 | A3 (android P15/P16) | Binds delivery to a paired agent: `authSlot="remote:"+origin`, binding `mode "local"` with `origin`, `ownerId`, `agentId` — the remote/paired agent path the PRD excludes ("No hosted-agent pairing") | Owner decision with P15: if remote/local-origin delivery modes are deleted, delete this test with them; if kept, keep the test | High coupling to the P15 decision |
| 2 | 67-79 | C5 | `Fixture` HTTP server is a near copy of `HostedProcessRestartInstrumentedTest.Fixture` (diff: only constructor/ports and `loseAck`) | One `HostedAgentFixture(JSONObject saved, boolean loseAck)` in a shared file used by both | Low |
| 3 | 37, 46-47 | D11 | Fixture names `"legacy-worker-client"`, message "Legacy ciphertext must not be rewritten" — not a legacy format, just the existing record | Rename to `fixture-worker-client` / "Stored ciphertext must not be rewritten" (both Hosted tests together; the server route string changes with it) | None |
| 4 | 43-44 | C3 | WorkManager poll loop (also HostedProcessRestart:53-54) | `WorkTestDriver.awaitFinished(id, 70s)` | None |
| 5 | 69-76 | D8 | Server constructor and request parser on single 600-900-char lines | Formatter | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Fixture` | class | 67-79 | HostedProcessRestart:67-79 (near-identical); CloudVoice/Connection loopback servers | `HostedAgentFixture` (built on `LoopbackHttp`) |
| `read(File)` | helper | 66 | HostedProcessRestart.cipher:23 | `TestFiles.readAll` |

## Proposed end state
If hosted delivery stays: shared `HostedAgentFixture`, WorkManager wait helper, renamed fixture ids; estimated 80 -> ~45 lines.
If P15 removes remote/local-origin delivery: delete together with `HostedProcessRestartInstrumentedTest`, their registry
entries and the runner-test expectations (lines 430-473).

## Verification
`npm run test:android:instrumentation -- --owned-emulator --test-mocks --classes HostedBackgroundWorker` (secondary user);
`node --test test/android-instrumentation-runner.test.mjs`.
