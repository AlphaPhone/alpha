# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentStreamTransportInstrumentedTest.java
- Lines: 116 (≈11 KB; several 300-1,000-char lines) | Role: opt-in disposable-user test of the generated `ElizaAgentService.requestLocalAgentStream` socket client against a fake same-UID peer (split frames, cancel, EOF, error, retry-sleep, no replay). | Verdict: KEEP (move upstream later; see owner question)
- Importers: none (JUnit class). Run by `scripts/ci/resident-native.py:59` phase `ipc` (`residentStreamFixture`/`residentStreamRunId` args) inside `.github/workflows/resident-android.yml:519`. Not in `CLASS_REGISTRY` (driven by the Python campaign, which is listed in `CAMPAIGN_RUNNERS`). Text/path pins: only the class/method name in `resident-native.py:59`. No Quint manifest, feature-parity or LemmaScript pin.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-116 | T5 | Everything under test is upstream/generated code: `ElizaAgentService.requestLocalAgentStream`, `LocalStreamHandle`, `connectLocalAgentSocket`, `localSocketPath`. Alpha owns none of it. | Owner question: move this test to the upstream package that generates `ElizaAgentService` (it already has the resident host); keep here only until upstream runs it on an emulator. | Low for the move; dropping it without an upstream twin loses the only no-replay stream proof. |
| 2 | 104 | D7 | `ElizaAgentService.class.getDeclaredMethod("localSocketPath");pathMethod.setAccessible(true)` reflects into a private method of generated code. | If kept, ask upstream to expose the path (package-private or a constant) and drop reflection; otherwise delete with item 1. | Breaks silently on upstream rename (fails loudly at runtime, not at compile time). |
| 3 | 38 | B1 | `quiet(Closeable)` swallows `IOException` on close. | Keep: closing a fixture socket during teardown is the documented-race case; add a one-line comment. | None. |
| 4 | 47, 73-82, 84 | D8 | Whole thread bodies and close sequences on single 400-1,000-char lines (`Peer` constructor lambda, `close()`). | Formatter pass; extract `Peer.serve(socket)` for the per-mode branch (lines 75-81). | None. |
| 5 | 112 | T8 | Polls `client.thread.getStackTrace()` for frame `connectLocalAgentSocket` in `TIMED_WAITING` to witness the retry sleep: couples the test to an upstream private method name and stack shape. | Keep only if upstream exposes no hook; otherwise assert on elapsed time / event contract only. | Upstream refactor of the retry loop fails this test with no product change. |
| 6 | 101-102 | B3 | Run-id regex `[0-9a-f-]{36}` re-validates a value the Python supervisor generated itself (`str(uuid.uuid4())`). | Keep the presence check, drop the regex (harmless, minor). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `socketPath()` | helper | 20-25 | `PrivateResidentSocketInstrumentedTest` performs similar `ipc` directory stat checks | Shared `ResidentTestFixture.ipcDirectory()` if both stay |
| `send` / `readLine` (newline-framed socket I/O) | helper | 28-37 | Similar header readers in `ResidentWorkflowCrashInstrumentedTest.HeldModel` (160-161) and `ScopedVoicePlaybackInstrumentedTest.Fixture` (64-70) — those are HTTP, this is NDJSON | Keep local |
| `quiet(Closeable)` | helper | 38 | Many androidTest close-quietly lambdas | Keep local |
| `Client`, `Peer` | class | 39-85 | none | Keep local |

## Proposed end state
Unchanged behaviour; formatted (physical lines grow, logical size unchanged), reflection replaced by an upstream accessor when available,
`quiet` commented. Long term this file moves upstream next to `ElizaAgentService`'s generator and is deleted here together with
the `ipc` phase in `scripts/ci/resident-native.py:59`. Estimated lines after (content, pre-formatter): ~110.

## Verification
`scripts/ci/resident-native.py` phase `ipc` (resident-android workflow, disposable user, ARM64/x86_64 emulator). Any edit needs that
workflow run; host tests do not cover it.
