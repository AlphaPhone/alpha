# test/quint-batch-capture-completion.test.mjs
- Lines: 14 | Kind: Quint replay wrapper (model `BatchCaptureCompletion`, driver `specs/quint/refinement/native/batch-capture-completion.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: renderer batch voice capture rejects foreign or call-interrupted drafts and keeps cleanup failures. Product code: `apps/app/src/prototype/voice-adapter.ts`, `apps/app/src/runtime/cloud-voice.ts`; model live (in `specs/quint/native/manifest.json`). Duplicates: the same campaign runs again in `runNativeRefinement()` (`specs/quint/refinement/native/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `batch-capture-completion.mjs`; the campaign also runs in the native aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===scenarios.length`, `invariant==='safety'`, 7 `actions.*>0`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/native/batch-capture-completion.mjs`): slices `voice-adapter.ts` (5 sites) and evals. | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | driver | D11 | Renderer model filed under the `native` family. | Move to `application` when the registry is rebuilt. | Low |

## Proposed end state
File deleted. `BatchCaptureCompletion` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
