# test/quint-canonical-notes-refinement.test.mjs
- Lines: 9 | Kind: Quint replay wrapper (model `CanonicalNotesStore`, driver `specs/quint/refinement/services/notes-store/index.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: actual Notes store mutations refine raw, visible and committed identities. Product code: Notes store modules via `notes-store/index.mjs`; model live (in `specs/quint/services/manifest.json`). Duplicates: the same campaign runs again in `runServicesRefinement()` (`specs/quint/refinement/services/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `index.mjs`; the campaign also runs in the services aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `receipts.length===1`, `obligations.length>0`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/services/notes-store/index.mjs`): family sub-aggregate. | No change needed for the tie. | Low |
| 4 | 7-8 | B5 | Asserts receipt and obligation counts only. | Drop. | Low |

## Proposed end state
File deleted. `CanonicalNotesStore` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
