# android/app/src/androidTest/java/ai/alphacompute/alphaphone/DeviceActionInstrumentedTest.java
- Lines: 128 | Role: opt-in pairing to a patched loopback backend (`http://10.0.2.2:47840`), real model proposals for create_note / create_reminder / open_view / browser_navigate, one-shot approval, durable journal. | Verdict: DELETE
- Importers: none. Calls `new BrowserFlowInstrumentedTest().child(...)`.
  Text/path pins: `scripts/android-instrumentation.ts:332` `NOT_RUN_BY_A_RUNNER.DeviceAction` ("its runner was removed in 49b1bf4c"); `test/android-instrumentation-runner.test.mjs:203-205`. Fixture `device-action-pairing.json`: no writer in the repo (git grep). Other "DeviceAction" hits (specs/quint DeviceActions.qnt, scripts/test-device-actions.ts) are unrelated names, not this class.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | P20 / A7 | No runner; fixture writer gone; gate `deviceActions=true` set by nobody | Delete file + NOT_RUN entry | None |
| 2 | 59-63 | A3 (P15) | Pairs via chooser "Local development agent" / "Connect local agent" (remote agent pairing excluded by PRD) | — (deleted) | — |
| 3 | 43-45 | A7 | Java `hash(String)` is never called (the 4 other `hash(` hits are inside JS strings) | — (deleted) | — |
| 4 | 83, 118 | T6 | In-page SHA-256/journal inspection scripts | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until`/`click`/`propose`/`approval`/`reminder`/`hash` | helper | 21-45 | Combined*, Connection:25 | deleted |

## Proposed end state
Deleted. 128 -> 0 lines.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`.
