# test/quint-calendar-approval-review.test.mjs
- Lines: 16 | Kind: Quint replay wrapper (model `CalendarApprovalReview`, driver `specs/quint/refinement/application/calendar-approval-review.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: typed Calendar decisions consume one exact current read and never replay uncertainty. Product code: `apps/app/src/runtime/calendar-approval-client.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `calendar-approval-review.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===29` plus final-state literals of 7 named traces; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/calendar-approval-review.mjs`): runs the real client (no slice found). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | 9-15 | P8 | Re-asserts final `expect` values of named traces that the replay already compared step by step. | Delete. | Low |

## Proposed end state
File deleted. `CalendarApprovalReview` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
