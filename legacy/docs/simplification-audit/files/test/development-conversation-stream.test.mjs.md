# test/development-conversation-stream.test.mjs
- Lines: 119 | Kind: integration (real `createLocalAgentDevHandler` over HTTP via in-process `duplexPair`, synthetic upstream SSE stream) | Verdict: MERGE into `test/dev-local-agent-bridge.test.mjs`
- Covers: the dev bridge relays conversation SSE events once and in order through backpressure, aborts the upstream on page disconnect without retry, and its 120 s deadline ends a stalled or late stream. Duplicates: the drain/deadline harness is copied in `development-cloud-voice.test.mjs:121-165`; `scripts/test-local-agent-stream.ts` covers the renderer side of streaming. Callers/importers: `npm test`. Research row 701 ("tests a scripts/ module") is right.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T9 | tsx self-respawn. | Load once in the merged suite. | None. |
| 2 | 14-43 | C4 | Pairing fake and server set-up duplicated with 5 sibling files. | Shared fixture `test/fixtures/dev-bridge.mjs`. | None. |
| 3 | 88, 106 | T8 | Monkey-patches the global `AbortSignal.timeout` to hold every deadline; restores in `finally`. Acceptable but global. | Keep, inside the shared fixture as `holdDeadlines()`. | Low. |
| 4 | 61-119 | - | Ordering, disconnect-abort and deadline cases: real behaviour of a dev surface the retained Playwright suite uses (`local-agent-stream.spec.ts`). | Carry all four. | - |

## Proposed end state
Four cases in `test/dev-local-agent-bridge.test.mjs`; the TTS deadline variants in `development-cloud-voice` collapse onto
the same helper.
