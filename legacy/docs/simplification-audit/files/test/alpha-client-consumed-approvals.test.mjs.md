# test/alpha-client-consumed-approvals.test.mjs
- Lines: 55 | Kind: integration-lite (real `AlphaClient` via `tsImport`, in-memory transport) + one source-text test (49-55) | Verdict: MERGE lines 18-47 into `test/integration/alpha-client.test.mjs`; DELETE 49-55
- Covers: an approved proposal is dispatched once per agent session, including after a history reload; a new session starts clean. Duplicates: none found. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-47 | - | Double-dispatch prevention through the client's public API: security relevant, transport is the trust boundary. | Keep in the merged client file. | Medium if dropped |
| 2 | 49-55 | T1 | Regex over `agent-adapter.ts` that the reload path calls `disconnect({keepConsumed:true})`. | Delete; cover "approve, reload history, agent re-offers, no second dispatch" in `journeys/chat.spec.ts`. | Low |

## Proposed end state
Gone as a file. `test/integration/alpha-client.test.mjs` (with `alpha-client-sensitive`) holds the two consumed-approval
cases on one transport fixture.
