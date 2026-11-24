# test/quint-automatic-app-update-schedule.test.mjs
- Lines: 10 | Kind: Quint replay wrapper (model `AutomaticAppUpdateSchedule`, driver `specs/quint/refinement/application/automatic-app-update-schedule.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: foreground update checks keep polling, back off offline and retire stale owners without overlapping native calls. Product code: `apps/app/src/prototype/settings-adapter.ts` (`// settings-facts:begin/end` region), `main.tsx`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `automatic-app-update-schedule.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traceInputs.length===16`, `observedFields.length===17`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/automatic-app-update-schedule.mjs`): slices the `settings-facts` marker region (`automatic-app-update-schedule.mjs:54`) and evals it. | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | driver | T10 | Shares the `settings-facts` marker region with three host tests. | PORT when app-update policy moves to `runtime/app-update.ts`: import `updateCheckDue`, `updateIdle`, `automaticUpdateIdle`. | Medium |

## Proposed end state
File deleted. `AutomaticAppUpdateSchedule` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
