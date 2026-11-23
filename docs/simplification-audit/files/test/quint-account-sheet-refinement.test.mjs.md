# test/quint-account-sheet-refinement.test.mjs
- Lines: 9 | Kind: Quint replay wrapper (model `AccountSheet`, driver `specs/quint/refinement/application/account-sheet.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: mounted Account navigation and the retained sign-out confirmation keep owned credentials and data. Product code: `apps/app/src/runtime/connection-ui.tsx` (+ `.eliza/client-features`, `apps/app/index.html`, `cloud-deployment.generated.gradle`); model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `account-sheet.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===5`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/account-sheet.mjs`): esbuild-bundles the real renderer modules (no text slice found by grep). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |

## Proposed end state
File deleted. `AccountSheet` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
