# test/quint-canonical-calendar-editor-close.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `CanonicalCalendarEditorClose`, driver `specs/quint/refinement/application/canonical-calendar-editor-close.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: mounted Calendar Back, close and discard match the retained-editor model. Product code: `canonical-calendar-drafts.ts`, `assistant-draft-controller.ts`, `model.js`, `template.html`, `subview-accessibility.ts`, `runtime/canonical-calendar-draft.ts`, upstream `durable-draft-controller.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `canonical-calendar-editor-close.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===8`, `checkpoints===80`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/canonical-calendar-editor-close.mjs`): mounted in Chromium via `calendar-mounted-editor.mjs`. | No change needed for the tie. | Low |
| 4 | driver | D4 | Lists `apps/app/src/prototype/assistant-draft-controller.ts`, a one-line shim another chunk deletes. | Update the driver source list in the same change. | Low |
| 5 | 6 | T8/P12 | 420 s budget; Chromium from node:test. | As above. | Medium |

## Proposed end state
File deleted. `CanonicalCalendarEditorClose` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
