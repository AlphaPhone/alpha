# test/quint-app-update-candidate.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `AppUpdateCandidate`, driver `specs/quint/refinement/services/app-update-candidate.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: unsigned update-candidate CLI results respect version floors, exact attempts and immutable evidence. Product code: `scripts/app-update-candidate.ts`, `deliver-app-update.ts`, `update-artifact.ts` (+ `test/fixtures/app-update-candidate.mjs`); model live (in `specs/quint/services/manifest.json`). Duplicates: the same campaign runs again in `runServicesRefinement()` (`specs/quint/refinement/services/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `app-update-candidate.mjs`; the campaign also runs in the services aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===14`, `checkpoints>=40`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/services/app-update-candidate.mjs`): imports the real scripts (good tie). | No change needed for the tie. | Low |

## Proposed end state
File deleted. `AppUpdateCandidate` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
