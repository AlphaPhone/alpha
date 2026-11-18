# test/fixtures/workflow-device-bindings.mjs
- Lines: 21 | Kind: transplant fixture (slices `workflow-presentation.ts` up to a marker comment and evals it into a vm sandbox) | Verdict: DELETE
- Covers: installs `workflowDeviceProtocol` and `registerWorkflowDevice` into a sandbox that extracts `connection-ui.tsx`. Duplicates: none useful. Callers/importers: `test/resident-explicit-panel-startup.test.mjs` (DELETE), `test/workflow-device-bindings-fixture.test.mjs` (DELETE: tests this fixture), `scripts/test-connection-history.ts:23` (research: move to `test/` as a suite).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-19 | T2, D7 | Cuts at the marker `/** Probe installed bridge code` and strips `export`. The marker comment exists for this slice. | Delete. `registerWorkflowDevice` is already exported (`workflow-presentation.ts:16`); a surviving suite imports it directly. Drop the marker when the last slicer is gone. | low |
| 2 | 14 | B4 | Guards that the sandbox supplies a probe fixture. | Gone. | none |

## Proposed end state
Gone. When `scripts/test-connection-history.ts` moves into a connection-cloud integration test, it imports
`workflow-presentation.ts` normally instead of evaluating `connection-ui.tsx` in a sandbox.
