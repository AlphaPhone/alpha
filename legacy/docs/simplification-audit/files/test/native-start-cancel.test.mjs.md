# test/native-start-cancel.test.mjs
- Lines: 32 | Kind: integration of the real `apps/app/src/runtime/local-agent.ts` bundled with a Capacitor stub (what the renderer sends across the bridge) | Verdict: MERGE into `test/integration/resident-runtime.test.ts`
- Covers: cancelling a native resident start sends `cancelStart` with the same requestId; a completed start sends none. Duplicates: Quint `ResidentStartCancelReplay.java` / `refinement/native/local-agent.mjs`; `test/resident-attachment.test.mjs`; `test/agent-always-local.test.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-10 | C5 | Same bundle/stub loader as `native-request-cancel.test.mjs`. | Share one loader. | None |
| 2 | 25-32 | T4 | "completed start sends no cancellation" also exercised by the Quint replay. | Keep only test 1 if the replay is retained. | Low |

## Proposed end state
One case (abort → `cancelStart` with the start's requestId) in the resident-runtime integration file, using the shared
bundled `LocalAgentProtocol`.
