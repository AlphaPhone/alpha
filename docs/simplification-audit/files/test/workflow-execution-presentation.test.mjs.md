# test/workflow-execution-presentation.test.mjs
- Lines: 24 | Kind: transplant (uses `fixtures/workflow-execution-fixture.mjs`, which evals the workflow adapter in a vm via `scripts/workflow-renderer-fixture.ts`) + markup render through `fixtures/workflow-execution-markup.mjs` and jsdom; re-spawns itself under tsx | Verdict: DELETE
- Covers: finished, waiting, unknown and older-version run views show the right controls and notices; the execution template keeps technical IDs in a closed details element. Duplicates: `test/browser/workflow-presentation-execution.spec.ts`, `dev-workflow-execution.spec.ts`, `workflow-outcome-unknown.spec.ts`, `workflow-dialog-layout.spec.ts`. Callers/importers: `npm test` glob; sole importer of `fixtures/workflow-execution-fixture.mjs` and `fixtures/workflow-execution-markup.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-7 | T9 | tsx self-respawn. | Delete. | None |
| 2 | 10-14 | T2/D8 | Five tests on single lines up to ~900 characters, driving the vm fixture and monkey-patching `WorkflowIntentStore.prototype.load`. | Delete. | Low |
| 3 | 16-24 | T6-like | Markup checks with jsdom (closed `<details>`, no phone-steps region). | Move the "IDs live in closed details" assertion to the journey. | Low |

## Proposed end state
File and both fixtures deleted. `journeys/workflows.spec.ts` asserts on an opened finished run: the result text is visible, run ID and history sit inside a collapsed "Workflow execution details", and Done closes without a new run; an outcome-unknown run shows "Check before running again".
