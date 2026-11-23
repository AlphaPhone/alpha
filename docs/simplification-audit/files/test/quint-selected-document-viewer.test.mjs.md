# test/quint-selected-document-viewer.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Selected document preview follows every SelectedDocumentViewer trace (`application/selected-document-viewer.mjs` over `browser/selected-document-viewer.ts`). Duplicates: Not in an aggregate; this file is the only runner. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-10 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 48, checkpoints > 1000, 7 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |

## Proposed end state
- Runner row.
