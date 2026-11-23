# test/quint-browser-cloud-request-custody.test.mjs
- Lines: 12 | Kind: Quint replay wrapper (model `BrowserCloudRequestCustody`, driver `specs/quint/refinement/services/browser-cloud-request-custody.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: the browser Cloud dev bridge keeps the exact active request through duplicate rejection and late completion. Product code: `scripts/browser-cloud-dev-bridge.ts`, `cloud-deployment-policy.ts`, `native-view-policy.ts`; model live (in `specs/quint/services/manifest.json`). Duplicates: the same campaign runs again in `runServicesRefinement()` (`specs/quint/refinement/services/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `browser-cloud-request-custody.mjs`; the campaign also runs in the services aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===3`, `checkpoints===25`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/services/browser-cloud-request-custody.mjs`): esbuild-bundles the real script. | No change needed for the tie. | Low |
| 4 | all | D6 | Models a development surface (`dev:cloud` bridge). Live only while the dev bridge stays (D6/D19). | Delete model, driver and wrapper together if the bridge goes. | Low |
| 5 | 11 | B5 | Calls `verifyRefinementReceiptInputs`. | Drop with receipts. | Low |

## Proposed end state
File deleted. `BrowserCloudRequestCustody` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
