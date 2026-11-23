# test/workflow-approval-poster.test.mjs
- Lines: 66 | Kind: unit of upstream code (esbuild-bundles `.eliza/client-features/packages/contracts/src/workflow-approval-poster.ts` with the local `workflowApprovalNotice`, drives it with a fake session and native) | Verdict: DELETE
- Covers: one redacted notice per waiting run; withdraw on settlement, keep on transient failure; no post for another owner or stale session; queued stale-owner work does nothing; older waiting runs survive definition changes. Duplicates: upstream module (follow-up: upstream test), `test/browser/workflow-notices.spec.ts`, `workflow-notice-lifecycle.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3 | T5 | The poster under test is the pinned upstream contract; the product imports it from `.eliza` (`workflow-adapter.ts:2,281`). | Delete; list as an upstream test follow-up (D14). | Medium |
| 2 | 8-16 | T3 | Fake session, native, queue. | Delete. | None |
| 3 | n/a | A2/A7 | A local `createWorkflowApprovalPoster` still exists in `apps/app/src/runtime/workflow-device-contract.ts:123` with no importer (the adapter and `scripts/workflow-renderer-fixture.ts` use the upstream one). | Delete the local copy (product cleanup). | None |

## Proposed end state
File deleted. The visible behaviour (a waiting run posts one notice; deciding withdraws it) stays in `journeys/workflows.spec.ts` (from `workflow-notice-lifecycle.spec.ts`). Poster edge cases belong in upstream `packages/contracts`.
