# test/quint-browser-journal-retention-refinement.test.mjs
- Lines: 11 | Kind: Quint replay wrapper (model `BrowserJournalRetention`, driver `specs/quint/refinement/application/browser-journal-retention.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: browser journal retention and Calendar/Reminder mutation checkpoints match the model. Product code: `apps/app/src/browser/` (via `browser-daily-stores.mjs`); model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `browser-journal-retention.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===16`, `obligations.length>0`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/browser-journal-retention.mjs`): fixture-run stores; 1 slice site. | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | 10 | B5 | Asserts that "obligations" (unproved remainder) is non-empty. | Drop. | Low |

## Proposed end state
File deleted. `BrowserJournalRetention` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
