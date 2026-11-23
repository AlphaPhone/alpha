# test/quint-browser-deletion-poll.test.mjs
- Lines: 11 | Kind: Quint replay wrapper (model `BrowserDeletionPoll`, driver `specs/quint/refinement/application/browser-deletion-poll.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: overlapping Calendar and Reminder polls keep the committed deletion revision. Product code: `apps/app/src/browser/{calendar,calendar-store,calendar-deletions,reminder-store,reminder-deletions,daily,domain-document,journal-retention}.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `browser-deletion-poll.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===6`, `checkpoints===34`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/browser-deletion-poll.mjs`): runs the real stores through `test/fixtures/browser-daily-stores.mjs`. | No change needed for the tie. | Low |

## Proposed end state
File deleted. `BrowserDeletionPoll` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
