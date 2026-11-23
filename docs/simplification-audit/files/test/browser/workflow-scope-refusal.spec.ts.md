# test/browser/workflow-scope-refusal.spec.ts
- Lines: 41 | Kind: Playwright spec, chromium, 2 tests; real UI, protocol patched in page | Verdict: MERGE into `journeys/workflows.spec.ts` (generation section; 422 case only)
- Covers: an unsupported request ("Call Maya…") is refused before any generation call with the supported-steps hint; a 422 clarification is shown and the draft and request kept, after which a supported prompt still generates. Duplicates: test 1 duplicates `workflows.production.spec.ts` test 4 (scope refusal in the flag-off bundle) and the host scope table `test/workflow-scope.test.mjs`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-30 | T4 | Scope refusal already proven on the production bundle. | Delete test 1. | None. |
| 2 | 8-18 | T6/C5 | Same `WorkflowProtocol.prototype` patch as `workflow-generation.spec.ts`. | Use `harness/workflow-agent.ts` with a `clarify` mode. | Low. |
| 3 | 32-41 | ok | Clarification keeps the draft. | Carry into the generation section. | None. |

## Proposed end state
One step in the generation section: agent answers 422 → clarification shown, request and draft kept; next prompt
generates. File deleted.
