# test/quint-android-gzip-asset-stage.test.mjs
- Lines: 10 | Kind: Quint replay wrapper (model `AndroidGzipAssetStage`, driver `specs/quint/refinement/services/android-gzip-asset-stage.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: Android gzip asset protection and byte verification preserve the published asset. Product code: `scripts/android-gzip-assets.ts`, `build-android.ts`, `verify-apks.ts` (+ `test/fixtures/android-gzip-assets.mjs`); model live (in `specs/quint/services/manifest.json`). Duplicates: the same campaign runs again in `runServicesRefinement()` (`specs/quint/refinement/services/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `android-gzip-asset-stage.mjs`; the campaign also runs in the services aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===6`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/services/android-gzip-asset-stage.mjs`): imports `android-gzip-assets.ts`; 2 slice sites. | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | 6 | T8 | No explicit timeout, unlike its siblings; inherits the 600 s runner default. | Runner sets per-model budgets from the manifest. | Low |

## Proposed end state
File deleted. `AndroidGzipAssetStage` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
