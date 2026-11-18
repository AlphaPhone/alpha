# test/quint-camera-focus-writes.test.mjs
- Lines: 14 | Kind: Quint replay wrapper (model `CameraFocusWrites`, driver `specs/quint/refinement/application/camera-focus-writes.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: browser tap-to-focus follows every CameraFocusWrites step. Product code: `apps/app/src/browser/camera-focus.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: none (not in any family aggregate; this wrapper is its only runner). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 | Thin wrapper; this is the only place the campaign runs. | Delete after `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) registers the model (it must be added to the family registry explicitly). | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===300`, `steps>1000`, 4 `actions.*>0`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/camera-focus-writes.mjs`): loads the module with optional source rewrite. | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Low |
| 4 | 11-14 | B5 | Mutation canary rewriting the literal `const alive=()=>token===this.epoch&&...` line. | Delete the canary. | Low |
| 5 | all | T4 | Not in the application aggregate. | Register in the runner. | Low |

## Proposed end state
File deleted. `CameraFocusWrites` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
