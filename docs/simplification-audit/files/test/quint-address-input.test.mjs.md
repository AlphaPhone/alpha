# test/quint-address-input.test.mjs
- Lines: 21 | Kind: Quint replay wrapper (model `AddressInput`, driver `specs/quint/refinement/application/address-input.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: the Browser address bar classifies every corpus text and model submission (URL / search / refused) as the model does. Product code: `apps/app/src/prototype/browser-adapter.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: none (not in any family aggregate; this wrapper is its only runner). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 | Thin wrapper; this is the only place the campaign runs. | Delete after `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) registers the model (it must be added to the family registry explicitly). | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `corpusChecks===corpus.length*2`, `classes>=15`, `replayed>30`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/address-input.mjs`): slices `browser-adapter.ts` by text (6 slice sites, 3 evals). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | 12-21 | T5 | Second test checks that the driver's own corpus covers each kind of input: a test of test data. | Delete; if wanted, make it an assertion inside the driver. | Low |
| 5 | driver | T10 | Not in the application aggregate: the runner must register it explicitly. | Add to the family registry when the aggregate is replaced. | Low |

## Proposed end state
File deleted. `AddressInput` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
The driver should import an exported address classifier (move it out of `browser-adapter.ts` into `browser/address-input.ts`).
