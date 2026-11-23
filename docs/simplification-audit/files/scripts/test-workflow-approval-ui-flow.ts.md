# scripts/test-workflow-approval-ui-flow.ts
- Lines: 29 | Kind: source transplant (`scripts/workflow-renderer-fixture.ts` evaluates `prototype/workflow-authoring.ts` text in `vm`) driving a synthetic HTTP host | Verdict: REWRITE as cases in `journeys/workflows.spec.ts`
- Covers: approval needs a second confirmation; a lost decision response keeps a persistent lock and is reconciled by GET without re-POST after recreation; missing disclosure blocks approve but allows deny; account switch aborts and retains the old intent; generic 409 never auto-retries; a stopped run closes an unrecorded decision. Duplicates: `test/browser/workflows.production.spec.ts:169` (second confirmation, approve/deny), `workflow-presentation-execution.spec.ts`, `dev-workflow-phone.spec.ts`. Callers/importers: `test/adapter-contracts.test.mjs` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 13 | T2 | Renderer is a transplanted module, not the app. | Playwright with `page.route` on `/api/workflow/executions/*/approvals/*` to drop/hold/409 responses. | Low |
| 2 | 22, 27 | T8 | Fixed 40 ms sleeps. | Wait on visible state. | None |

Cases worth carrying (not in `workflows.production.spec.ts`): dropped decision response -> status "Unknown", reopen shows "approved" with no second POST; missing operation disclosure -> approve disabled, deny allowed; run stopped with an unrecorded decision -> "Closed", no POST.

## Proposed end state
Deleted; three cases in `journeys/workflows.spec.ts`. `scripts/workflow-renderer-fixture.ts` loses one of four script importers.
