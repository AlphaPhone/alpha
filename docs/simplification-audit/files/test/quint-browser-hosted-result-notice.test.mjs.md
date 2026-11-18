# test/quint-browser-hosted-result-notice.test.mjs
- Lines: 11 | Kind: Quint replay wrapper (model `BrowserHostedResultNotice`, driver `specs/quint/refinement/application/browser-hosted-result-notice.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: the browser hosted-results ledger publishes exact results, redacts, and reads back on tap. Product code: `apps/app/src/browser/hosted-results.ts`, `notice-action.ts`, `domain-document.ts`, `revision.ts`, `screen-locked.ts`, `runtime/hosted-result-notices.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `browser-hosted-result-notice.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===10`, `observedFields.length===14`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/browser-hosted-result-notice.mjs`): runs the browser modules (no slice found by grep). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | all | D5 | "Hosted results" here are digest/workflow results shown as notices, a live path (not the deleted hosted-agent pairing). | Keep. | Low |

## Proposed end state
File deleted. `BrowserHostedResultNotice` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
