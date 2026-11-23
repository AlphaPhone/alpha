# test/quint-android-build-input-readiness.test.mjs
- Lines: 11 | Kind: Quint replay wrapper (model `AndroidBuildInputReadiness`, driver `specs/quint/refinement/services/android-build-input-readiness.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: native Android prerequisite reports and early/full refusals of `android:build` follow the readiness model. Product code: `scripts/android-build-preflight.ts`, `build-embedding-host.ts`, `stage-embedding-host.ts`, `voice-host.ts`, `mobile-uuid-adapter.ts`; model live (in `specs/quint/services/manifest.json`). Duplicates: the same campaign runs again in `runServicesRefinement()` (`specs/quint/refinement/services/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `android-build-input-readiness.mjs`; the campaign also runs in the services aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===8`, `observedFields.length===6`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/services/android-build-input-readiness.mjs`): imports the real scripts (good tie). | No change needed for the tie. | Low |

## Proposed end state
File deleted. `AndroidBuildInputReadiness` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
