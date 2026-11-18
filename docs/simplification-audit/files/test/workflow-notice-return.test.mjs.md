# test/workflow-notice-return.test.mjs
- Lines: 48 | Kind: two `node --import=tsx -e` programs whose assertions run inside the child (test 1: real `resolveWorkflowTap` from `runtime/workflow-device-contract.ts` with a fake native queue and binding; test 2: upstream `.eliza/.../notice-routes.ts` `revalidateWorkflowApprovalNotice`) | Verdict: MERGE test 1 into `test/integration/workflows-protocol.test.mjs`; delete test 2
- Covers: an unavailable tap lookup retains nothing and later validation still runs; owner return requires the current revision, the exact pending proposal, unexpired notice and stable session. Duplicates: `test/browser/workflow-notice-taps.spec.ts`; upstream `vendor/eliza/packages/contracts/src/notice-routes.test.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-27, 30-47 | T9 | Assertions live in a string program; node:test sees only a `PASS` match. | Direct import. | None |
| 2 | 29-48 | T5 | Exercises the upstream revalidation, already tested upstream. | Delete. | None |
| 3 | 3-27 | keep | `resolveWorkflowTap` sequencing (lookup unavailable, abort, mismatch, recheck failure, no consume) is the device-contract boundary. | Carry as one case. | Low |

## Proposed end state
Deleted as a file; one "tap resolution" case in the protocol integration file. Notification-tap UI stays in `journeys/workflows.spec.ts`.
