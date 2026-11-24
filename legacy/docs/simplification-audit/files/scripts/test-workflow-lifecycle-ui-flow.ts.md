# scripts/test-workflow-lifecycle-ui-flow.ts
- Lines: 19 (≈5.6 KB, statement soup) | Kind: transplant-backed flow test (real `WorkflowProtocol` over loopback HTTP, but the renderer is `workflow-adapter.ts`/`workflow-authoring.ts` sliced as text and run in `vm` by `workflow-renderer-fixture.ts`) | Verdict: REWRITE as `test/browser/journeys/workflows.spec.ts` (lifecycle cases), then DELETE
- Covers: remove/restore of a workflow needs an explicit review, a lost lifecycle response leaves one durable content-free intent that reconciles by GET (never re-POSTs), an account switch drops a held response, and a moved version clears an unapplied intent. Duplicates: `test/workflow-lifecycle-resend.test.mjs` (same fixture, overlapping resend cases); `test/browser/workflow-removed-navigation.spec.ts`, `workflow-retirement.spec.ts` (removed-workflow navigation). Callers/importers: only `test/adapter-contracts.test.mjs:10` (child-process shim, T9).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 10 | T2 | Renderer under test is a text transplant (`workflow-renderer-fixture.ts` strips imports/exports and evals the adapter in `vm` with fake `document`/`window`). Any rename/split of `workflow-adapter.ts` breaks it; it does not test the shipped module graph. | Rewrite the cases as a Playwright journey that drives the Workflows view against a synthetic agent route (`page.route('**/api/workflow/**')`). | Medium: the lost-response/no-resend invariant must survive the move. |
| 2 | 6–8 | C5 | Hand-written fake agent HTTP server; near-identical twins in `test-workflow-ui-flow.ts`, `test-workflow-metadata-ui-flow.ts`, `test-workflow-protocol.ts`. | One `test/fixtures/workflow-agent.ts` fake (routes + counters + `drop`/`hold` knobs) used by the journey. | Low |
| 3 | 13, 15–17 | T8 | `setTimeout(r,30)` sleep; `waitForWorkflow` 10 ms polling. | Journey waits on visible state. | Low |
| 4 | 3, 18 | B5 | Disclaimer docstring and a PASS banner listing claims. | Drop; test names carry this. | None |
| 5 | 6–19 | D8 | Whole test is 13 minified lines. | Gone with the rewrite. | None |

## Proposed end state
Delete the file and its entry in `test/adapter-contracts.test.mjs`. Carry into `journeys/workflows.spec.ts` (test.describe "lifecycle"):
1. Remove asks for review first; no POST until confirmed.
2. Lost lifecycle response: exactly one POST, item locked; reload reconciles by GET to the receipt, no second POST.
3. Lost response for a change the agent never applied stays locked while the version is current; clears once the version moves.
4. Removed workflow stays reachable under "Removed workflows" with its run history; restore comes back paused.
5. Switching account while a request is held discards the late response (no detail shown, intent kept for the original owner).
