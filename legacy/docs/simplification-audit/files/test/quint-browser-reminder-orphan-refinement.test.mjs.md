# test/quint-browser-reminder-orphan-refinement.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `BrowserReminderOrphan`, driver `specs/quint/refinement/application/browser-reminder-orphan.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: Reminder storage and Clock keep the persisted orphan-marker behaviour. Product code: `apps/app/src/browser/deletion-recovery.ts` and stores (fixtures `browser-daily-stores.mjs`, `browser-reminder-clock.mjs`); model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `browser-reminder-orphan.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===8`, `checkpoints===70`, `observedFields` includes one name; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/browser-reminder-orphan.mjs`): fixture-run real stores. | No change needed for the tie. | Low |

## Proposed end state
File deleted. `BrowserReminderOrphan` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
