# test/redaction-connection-switch.test.mjs
- Lines: 87 | Kind: integration (real `AlphaClient` with synthetic transports) | Verdict: KEEP, MERGE into `test/integration/connection-cloud.test.ts`
- Covers: Switching the agent connection never resends earlier raw context, cancels an in-flight request without retrying it on the new connection, and reconnecting starts clean. Duplicates: none found Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-9 | T9-minor | Uses `tsImport` from `tsx/esm/api` while most files use the global loader. | Use the runner's loader. | Low |
| 2 | 39-87 | keep | Imports the real client and checks a privacy property at its boundary: the shape the owner wants. | Carry all three cases. | Low |

## Proposed end state
- Three cases in the connection-cloud integration file.
