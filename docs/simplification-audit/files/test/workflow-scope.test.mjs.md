# test/workflow-scope.test.mjs
- Lines: 254 | Kind: unit of upstream code (imports `.eliza/client-features/packages/contracts/src/workflow-scope.ts`, the projection of `vendor/eliza/packages/contracts/src/workflow-scope.ts`) with ~330 phrase fixtures | Verdict: DELETE (move the phrase tables upstream)
- Covers: MVP-32 phrase refusal (calls, SMS, payments, contacts, code, email) before generation, supported phrasings not refused, refusal message format, operation labels. Duplicates: upstream `vendor/eliza/packages/contracts/src/workflow-scope.test.ts`; `test/browser/workflow-scope-refusal.spec.ts`, `mvp-workflow-scope.spec.ts` (UI refusal). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T5 | The filter is upstream's module; the product only calls `checkWorkflowScope` (`workflow-authoring.ts:13,178`). | Delete; D14 follow-up: merge any phrases missing from upstream's own test there. | Medium |
| 2 | 20, 34, 133 | A8 | "Round-3 review", "Round-4 review" history comments. | Goes with the file. | None |
| 3 | 241-254 | T1-like | Label/keys equality and "documented limits" pin today's misses so a change is deliberate. | Upstream concern. | None |

## Proposed end state
File deleted after confirming upstream's `workflow-scope.test.ts` carries the refused/supported tables (copy the round-4 tables upstream if not). `journeys/workflows.spec.ts` keeps one UI case: "Call Maya every morning" is refused with "Nothing was sent to the agent."
