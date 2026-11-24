# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CombinedAgentInstrumentedTest.java
- Lines: 115 | Role: one "Local development agent" pairing to a host runtime at `http://10.0.2.2:47859`, then chat, device-action note, paired Whisper/Kokoro voice, workflow run/approval/metadata loss/remove/restore. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:329` `NOT_RUN_BY_A_RUNNER.CombinedAgent` ("no Android runner starts or pairs it"); `test/android-instrumentation-runner.test.mjs:203-205` requires every NOT_RUN entry to be an existing class (so the entry must be removed with the file). Asset `androidTest/assets/paired-whisper-fixture.m4a` is also read by `PairedAsrInstrumentedTest`, `PairedAsrLiveInstrumentedTest` (keep the asset while those exist). Fixture file `combined-agent-fixture.json`: no writer anywhere in the repo (git grep: only this class).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | P20 / A7 / T9 | Never executed: listed in `NOT_RUN_BY_A_RUNNER`; nothing writes `combined-agent-fixture.json` | Delete file + `NOT_RUN_BY_A_RUNNER.CombinedAgent` | None (no runner) |
| 2 | 18, 97, 101 | A3 (android P15) | Pairs a remote/local-development agent (`remote:`+ORIGIN slot, "Connect local agent", `synthesizePaired`) — PRD line 17 "No hosted-agent pairing" | Delete (feature is test-mocks/developer only) | None |
| 3 | 1-82 | C5 / T4 | Lines 1-82 are byte-identical to `CombinedAgentRestartInstrumentedTest.java:1-82` apart from the class name (`diff` shows only line 17) | Removed with both files | — |
| 4 | 57, 60, 70 | T6 | Monkey-patches `Capacitor.nativePromise` in-page three times and reflects into upstream `LocalSpeechBridgePlugin.capture/playbackId/player` | Removed with the file | — |
| 5 | 26 | C3 | Local SHA-256 hex `hash(raw)` (Java digest copy #n) | Removed | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until`/`click`/`open`/`send`/`workflow`/`terminalReceipt`/`approvedReceipt`/`nativeJournal`/`voiceFlow`/`checkpoint`/`progress`/`hash`/`arrayHash`/`credential`/`field` | helpers | 20-82 | identical copies in CombinedAgentRestart:20-82; `hash` also in Connection:25, ConnectionRoutes:51, DeviceAction:43 | deleted |

## Proposed end state
File deleted. `NOT_RUN_BY_A_RUNNER.CombinedAgent` removed. If `scripts/start-combined-agent.ts` then has no Android consumer, the
owner decides whether the host launcher (and its Quint model `specs/quint/services/CombinedAgentLauncher.qnt`,
`specs/quint/refinement/services/combined-agent-launcher*.mjs`) stays for other uses. 115 -> 0 lines.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (reachability check: entry and class removed together).
