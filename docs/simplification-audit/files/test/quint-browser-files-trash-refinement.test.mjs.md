# test/quint-browser-files-trash-refinement.test.mjs
- Lines: 18 | Kind: Quint replay wrapper (model `BrowserFilesTrash`, driver `specs/quint/refinement/application/browser-files-trash.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: Files Trash locking, marker custody and recovery follow the model in web and fallback modes. Product code: `apps/app/src/browser/files.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `browser-files-trash.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===12`, 6 per mode, final-state literals of one trace; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/browser-files-trash.mjs`): imports the prepared module. | No change needed for the tie. | Low |
| 4 | 11-16 | P8 | Re-asserts the expected final state of the `failedPlacements` trace, which the replay already compared. | Delete. | Low |

## Proposed end state
File deleted. `BrowserFilesTrash` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
