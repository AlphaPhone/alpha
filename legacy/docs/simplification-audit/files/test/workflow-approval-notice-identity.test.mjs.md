# test/workflow-approval-notice-identity.test.mjs
- Lines: 20 | Kind: unit run in a `node --import=tsx -e` child (imports real `runtime/workflow-device-contract.ts` `workflowApprovalNotice`) | Verdict: MERGE into `test/integration/workflows-protocol.test.mjs`
- Covers: approval notice IDs are opaque, stable per approval, bound to the run route; a version change keeps the ID but changes the binding hash; an empty proposal is rejected. Duplicates: `test/workflow-approval-poster.test.mjs:17-23` (compares against the same function), `test/workflow-notice-return.test.mjs:29-48`, Java `test/fixtures/WorkflowApprovalNoticeTest.java`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T9 | Program in a template string run with `execFileSync(… '-e', script)`; a 120 s timeout for a hash. | Import directly in the integration file. | None |
| 2 | 14-19 | keep | Identity is shared with native notices (Java computes the same route); worth one case. | Carry all five assertions as one case. | Low |

## Proposed end state
Deleted as a file; one case "approval notice identity is stable per approval and route-bound" in `test/integration/workflows-protocol.test.mjs`.
