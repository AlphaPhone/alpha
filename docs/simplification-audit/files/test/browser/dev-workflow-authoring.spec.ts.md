# test/browser/dev-workflow-authoring.spec.ts
- Lines: 54 (12 KB) | Kind: Playwright, chromium; product workflow builder UI against the development agent workflow protocol (`?workflows=agent`, `browser/development-workflows.ts`), plus in-page draft-store races | Verdict: MERGE into `journeys/workflows.spec.ts` (backbone)
- Covers: building a typed workflow (Add Read step, review-then-Save), draft restore after reload, Describe keeps pending drafts, draft compare-exchange across tabs/owners, save retries. Duplicates: `workflow-generation.spec.ts` (Describe/generation), `workflow-dialog-layout.spec.ts`. Callers: chromium only. Helpers: `connection-diagnostics.ts`, `workflow-navigation.ts` (`installWorkflowListFixture`, `newWorkflow`, `workflowCard`), `calendar-draft-readiness.ts` (`guardCalendarFixture` imported as `guardNoMedia`), `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 12-17 | — | Real builder journey and draft restore after reload: product renderer (`prototype/workflow-authoring.ts`). | Carry. | None. |
| 2 | 8 | T6, C6 | `savedDraft()` rebuilds the slot id `'workflow-draft:v1:'+workflowSha([origin,ownerId,agentId])` with three `/src` imports. | Assert "Draft restored" in UI; drop raw slot reads. | Low. |
| 3 | 10, 34-42 | T6 | Cross-tab `secureCompareExchange` on `browserWorkflowDraftStore` in-page. | Delete (storage contract of a browser store; Android uses its slot store). | Low. |
| 4 | 11 | T6 | Save-receipt retry exercised by calling `getWorkflowClient().client.validatePhone/...` in-page against the dev fake. | Delete. | Low. |
| 5 | 23 | P3 | Replaces `navigator.locks.request` to hold the draft write. | Harness storage hold hook, or keep only `saved`/`left` outcomes via UI timing. | Medium: Describe-while-save-pending is a real race. |
| 6 | 43-54 | P3, T6 | Patches `browserDocuments.read` to finish after an owner switch; asserts "owner changed". | Delete here; privacy rule belongs in a host integration test on the document store if wanted. | Medium (privacy). |
| 7 | 3 | D11 | `guardCalendarFixture as guardNoMedia`: alias hides what the helper is. | Rename the helper (harness). | None. |

## Proposed end state
`journeys/workflows.spec.ts` (connected development profile, agent protocol fake) carries: create typed workflow with review-then-Save; draft restored after reload; Describe with a pending draft save keeps the draft (`saved`, `left`). Raw-store and race cases deleted.
