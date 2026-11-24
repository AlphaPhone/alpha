# test/fixtures/workflow-execution-fixture.mjs
- Lines: 22 | Kind: transplant fixture (strips `workflow-adapter.ts`, evals it in a vm with `workflowRendererFixture` and a real `WorkflowProtocol` over a fake transport) | Verdict: DELETE
- Covers: the workflow run detail: finished manual runs show Done and no device controls, pending device runs keep review/sync, unknown outcomes show "Check before running again", older versions are disclosed. Duplicates: `test/browser/dev-workflow-execution.spec.ts` drives the same run detail in the browser. Callers/importers: only `test/workflow-execution-presentation.test.mjs` (research DELETE).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T2 | Rewrites the adapter source (`^import` removed, first `export function` stripped) and evals it. | Delete with its importer. | low: confirm `journeys/workflows.spec.ts` keeps the four run-detail states listed above |
| 2 | 9, 11 | D8 | 600-character object literals on one line. | Gone. | none |
| 3 | 12-13 | — | Seeds `alpha.workflow.pending.v1:` storage, a persisted key worth keeping byte-identical; the journey should seed through the UI instead. | Carry the "pending lifecycle" case to the journey. | low |

## Proposed end state
Gone. The four run-detail states are cases in `journeys/workflows.spec.ts` (from `dev-workflow-execution.spec.ts`).
