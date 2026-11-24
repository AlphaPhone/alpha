# test/quint-app-info-handoff-composition.test.mjs
- Lines: 12 | Kind: Quint replay wrapper (model `AppInfoHandoffComposition`, driver `specs/quint/refinement/application/app-info-handoff-composition.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: mounted App info hands the exact selection to native and settles the reply. Product code: renderer + `.eliza/client-features` (pins `.source.json`); model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `app-info-handoff-composition.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===10`, `observedFields.length===11`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/app-info-handoff-composition.mjs`): mounts renderer code; one Java reference. | No change needed for the tie. | Low |
| 4 | 11 | B5 | Calls `verifyRefinementReceiptInputs(receipt)` itself: receipt re-hash ceremony. | Drop with receipt removal (ci-and-formal plan). | Low |

## Proposed end state
File deleted. `AppInfoHandoffComposition` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
