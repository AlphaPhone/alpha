# test/local-agent-native-stream.test.mjs
- Lines: 78 | Kind: integration-lite (bundles the real `runtime/local-agent-native-stream.ts` and `runtime/local-agent.ts` via `test/fixtures/browser-source.mjs`, fake Capacitor port, `node:test` mock timers) | Verdict: MERGE into `test/integration/resident-runtime.test.ts`
- Covers: native agent stream deadlines (heartbeats keep a 150 s turn open, 61 s silence ends with "Outcome unknown" and cancels the native stream, 600 s turn budget), `room_busy` frame and recovery-POST 429 are refusals before dispatch, other recovery failures keep the unknown outcome, streamed frame metadata (`provisional`/`direct`) reaches the caller. Duplicates: `test/browser/local-agent-native-stream.spec.ts` (2 parametrised tests, 12 `page.evaluate` calls: renders a streamed reply, retained navigation waits for settlement) covers rendering, not the deadlines; research's "delete (browser spec of same name)" would lose the timer rules. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-48 | — | Silence and turn-budget deadlines are product rules (unknown outcome, never a silent drop) only testable cheaply with mocked timers. | Keep (merge). | Low |
| 2 | 50-67 | T3 | Refusal-before-dispatch classification (429/room_busy) decides whether the composer may retry: keep as one table case. | Merge as one case. | Low |
| 3 | 69-78 | T3 | Frame metadata pass-through is a trivial forward. | Drop, or keep as one assertion inside the heartbeat case. | Low |
| 4 | 4-5 | D13 | esbuild bundle of browser sources for Node (needs `import.meta.env` define). Acceptable until modules import cleanly in Node. | Keep the loader; note D7 (`import.meta.env` shim) as the long-term fix. | Low |

## Proposed end state
File deleted; its cases form the "native stream" block of `test/integration/resident-runtime.test.ts` (four cases: heartbeat keeps open, silence → unknown + cancel, budget → unknown, refusal-before-dispatch table).
