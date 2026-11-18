# test/workflow-draft-reopen.test.mjs
- Lines: 110 | Kind: transplant (regex-strips imports of `prototype/workflow-authoring.ts`, evals it in a vm context with esbuild-bundled real helpers plus fakes for storage, catalog, connection controller) | Verdict: DELETE
- Covers: typed-workflow draft persistence: close/reopen waits for the pending save, owner change never carries a draft, write failure keeps edits, conflict with another window restores the newer draft, discard, save review text, refused description copy, app-update flush. Duplicates: `test/browser/dev-workflow-authoring.spec.ts`, `workflow-generation.spec.ts`, `workflow-scope-refusal.spec.ts` (refusal copy). Callers/importers: `npm test` glob; imports `.eliza/.../workflow-scope.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-10, 16-17 | T2 | Two module systems at once: an esbuild bundle as a `data:` module and a vm transplant of the target. | Delete. | Low |
| 2 | 15-16 | D5 | Storage is `developmentWorkflowDraftStore` and `browserLocalAgentEnabled:true`: the browser development path, not the Android slot store. | Delete. | None |
| 3 | 19, 32, 38 | T8 | `for(let i=0;i<5;i++)await Promise.resolve()` microtask counting to "settle". | Delete. | None |

## Proposed end state
File deleted. Carry three cases into `journeys/workflows.spec.ts` (from `dev-workflow-authoring.spec.ts`): an edited draft name survives closing and reopening the editor; a conflicting edit from a second tab is replaced by "Newer draft restored"; a refused description ("Call Maya every morning") shows a short toast and keeps the full refusal in the status line.
