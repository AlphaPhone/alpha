# specs/quint/services/ApprovalDecision.qnt
- Lines: 126 | Kind: Quint model, live (9 tests, 8 invariants, 4 witnesses, 10 symbol pins) | Verdict: KEEP; PORT its harness fixture
- Covers: one owner decision on a workflow approval. The decision is journalled before it is sent and released by the engine receipt. Checks: at most one decision per request digest, a retained intent blocks a second review, and a review is only of the known request. Sources: `apps/app/src/prototype/workflow-adapter.ts`, `runtime/workflow-protocol.ts`, `runtime/workflow-intents.ts` (all exist); `sharedSources` upstream `contracts/src/workflow-client.ts`, `workflow-intents.ts`. Duplicates: none in Quint (WorkflowExecution covers submission, not approval). Playwright workflow specs may click approvals; that is to be confirmed by the journey reviewers. Callers: harness `refinement/services/approval-decision-replay.mjs` (115 lines), through `forward-replays.mjs` (`serviceForwardReplayCampaigns`); wrapper `test/quint-approval-decision.test.mjs`; aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest symbols | T10 | 10 symbol pins: `approvalKey, approvalLocked, approvalReview, decideApproval, beforeDispatch, cancellationRequested, requestDigest` in `workflow-adapter.ts`, and `WorkflowApprovalReceipt`, `WorkflowIntentStore`, `workflowIntentKey`. Several are local identifiers, not exports, so renaming a local variable in the adapter breaks `quint:check` before any model runs. | Drop the `symbols` block. Pin files only (research §2.7). | low |
| 2 | harness | T2 / T10 | The harness gets the adapter from `refinement/services/workflow-adapter-fixture.mjs`, which `readFileSync`s `apps/app/src/prototype/workflow-adapter.ts`, strips types and evaluates it (reviewed separately: PORT). | PORT: have `workflow-adapter.ts` export a factory (or the approval sub-module `decideApproval`/`approvalReview`) that takes the view host and `WorkflowProtocol` as parameters, then `sourceModule`-import it as `workflow.mjs` does. | medium: the adapter is a D2 monkey-patch module, so the port depends on the `model.js` adapter refactor |
| 3 | 22-31 | — | Doc comments describe the protocol well (two-tap decide; the engine is the authority). | — | none |
| 4 | 84-88 | — | The four witnesses exercise the important corners: retained-unrecorded, replaced request, reviewed-not-sent, stale review. | Keep. | none |

## Proposed end state
Model unchanged, `symbols` removed. Its replay imports an exported approval module instead of transplanting `workflow-adapter.ts`. Do this port together with the stage-F split of the workflow adapter, not before.
