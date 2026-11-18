# test/quint-browser-reviews.test.mjs
- Lines: 11 | Kind: Quint replay wrapper (model `BrowserReviews`, driver `specs/quint/refinement/application/browser-reviews.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: browser review dialogs (confirm/approve/dismiss/hide/lock) follow every trace. Product code: `apps/app/src/browser/review.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: none (not in any family aggregate; this wrapper is its only runner). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 | Thin wrapper; this is the only place the campaign runs. | Delete after `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) registers the model (it must be added to the family registry explicitly). | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===49`, `checkpoints>1000`, 7 `actions.*>0`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/browser-reviews.mjs`): 1 slice site. | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | all | T4 | Not in the application aggregate. | Register in the runner. | Low |

## Proposed end state
File deleted. `BrowserReviews` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
