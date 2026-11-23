# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AllViewAgentContextInstrumentedTest.java
- Lines: 153 | Role: opt-in real local-agent context matrix across every view through the "Local development agent" pairing UI. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:328` (`NOT_RUN_BY_A_RUNNER.AllViewAgentContext: "... its runner was removed with the smoke suites in 49b1bf4c"`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 90-99 | A7/P20 | Never run: gated on arg `agentContext=true` and reads `agent-context-pairing.json` from app files; whole-repo grep for `agent-context-pairing` and `agentContext` (outside unrelated Playwright helpers) finds only this file and the NOT_RUN entry. No runner writes the fixture. | Delete file + `NOT_RUN_BY_A_RUNNER` entry. | Low. |
| 2 | 104-108 | A3/D6 | Drives the dev-only "Local development agent" pairing form (`connection-ui.tsx:4004`, `testMocksEnabled` only) and `evaluateSensitive` to type a pairing code; also deletes `alpha.connection.selection.v1` directly from localStorage (backdoor state change). PRD: no hosted-agent pairing. | Removed with #1. | — |
| 3 | 120 | C6 | Third hand-written view list `{"Home","Inbox",...}`. | Removed with #1. | — |
| 4 | 133-135 | — | Asserts deferred Phone/Messages/Contacts/Wallet controls absent — covered by renderer tests on Home (`test/browser` production specs). | none | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until(expr,timeout)` | helper | 63-67 | ~180 copies | deleted |
| `click(text)`/`label(label)` | helper | 37-40, 68-71 | BrowserFlow:25, BrowserContinuity:24, BrowserDialogLifecycle:18 | deleted |
| `ownedVideos`/`captureVideo` | helper | 31-62 | camera capture in CameraFlowInstrumentedTest | deleted |

## Proposed end state
File deleted (-153 lines); `NOT_RUN_BY_A_RUNNER.AllViewAgentContext` removed.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (class reachability).
