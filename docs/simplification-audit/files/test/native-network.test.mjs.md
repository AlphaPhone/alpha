# test/native-network.test.mjs
- Lines: 26 | Kind: unit with injected reader, real import of `apps/app/src/runtime/native-network.ts` (`readNativeNetwork`) | Verdict: MERGE into `test/integration/connection-cloud.test.ts`
- Covers: only an explicit boolean `connected` from the native bridge is believed; failures and timeouts stay unknown; abort settles at once and a late result cannot replace it. Duplicates: indirectly `native-network-lifecycle.test.mjs` (to be deleted). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10 | B3 | Validates native bridge output: a real trust boundary, so worth one table case. | Keep as one table. | None |
| 2 | 11-26 | T3 | Timeout/abort cases test the shared abort helper as much as this function. | Keep the abort case only. | Low |

## Proposed end state
Two cases inside the connection-cloud integration file: bridge-fact table (true/false/garbage → true/false/unknown) and
"abort settles promptly and a late result is ignored".
