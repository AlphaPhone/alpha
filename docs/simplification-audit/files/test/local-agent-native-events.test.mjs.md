# test/local-agent-native-events.test.mjs
- Lines: 44 | Kind: transplant (type-strips `runtime/local-agent-native-events.ts`, a 30-line module with no imports, and imports it as a `data:` URL) plus one child-process case (`node -e` program that bundles `local-agent.ts` with `loadBrowserModule`) | Verdict: MERGE into `test/integration/resident-runtime.test.ts` (real import), 2 cases
- Covers: the native voice-event feed admits only its own subscription and `voice-transcript` envelopes, treats `end` as terminal, never starts after an early stop, cancels again after a late acknowledgement, cleans up on admission rejection; the protocol fences callbacks after a session change or disconnect. Duplicates: `specs/quint/native/manifest.json:11` pins `local-agent-native-events.ts` for a native model; `test/browser/live-voice.spec.ts` test 2 ("native live transport admits only its own events … fences an owner change") covers admission and owner change in a browser. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T2 | Strips types and imports a text copy although the module has no imports and could be imported directly (Node strips types natively). | Import the real module. | Low |
| 2 | 30-44 | T9, T2 | Inline `node -e` program; its assertions are invisible to node:test (failure shows only exit status). | Inline as a normal case using `loadBrowserModule` in-process (as `local-agent-native-stream.test.mjs` does). | Low |
| 3 | 14-29 | T3, T4 | Five lifecycle cases of a 30-line function, partly duplicated by the browser spec. | Keep two: "foreign/other-stream events dropped and `end` terminal" and "stop during admission fences late events and unsubscribes after ack". | Low |

## Proposed end state
File deleted; two cases in the resident-runtime integration file (real `subscribeNativeVoiceEvents` and real
`LocalAgentProtocol.subscribeVoiceEvents` session fence) over a fake Capacitor port.
