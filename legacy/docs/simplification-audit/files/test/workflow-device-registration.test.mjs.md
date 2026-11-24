# test/workflow-device-registration.test.mjs
- Lines: 31 | Kind: unit in a `node --import=tsx -e` child (real `runtime/workflow-presentation.ts` `registerWorkflowDevice` with a fake register function) | Verdict: MERGE into `test/integration/workflows-protocol.test.mjs`
- Covers: AP-11 device registration offers protocol 3 and falls back to 2 only on HTTP 409; other failures do not downgrade. Duplicates: `test/workflow-device-bindings-fixture.test.mjs:14-26`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-22 | T9 | Program in a string, JSON round trip. | Direct import. | None |
| 2 | 23-30 | keep | Six-row table is the whole value. | Carry as one table case. | Low |

## Proposed end state
Deleted as a file; one table case "registration falls back from 3 only on 409" in the protocol integration file.
