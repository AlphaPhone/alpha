# test/quint-canonical-calendar-draft-handoff.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `CanonicalCalendarDraftHandoff`, driver `specs/quint/refinement/application/canonical-calendar-draft-handoff.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: mounted Note and scan handoffs admit canonical Calendar drafts as the model says. Product code: `canonical-calendar-drafts.ts`, `canonical-notes-ui.ts`, `camera-adapter.ts`, `scan-review.ts`, `scan-event-review.ts`, `agent-calendar.ts`, `assistant-draft-store.ts`, `browser/documents.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `canonical-calendar-draft-handoff.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===5`, `checkpoints===44`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/canonical-calendar-draft-handoff.mjs`): mounted in Chromium via `calendar-mounted-editor.mjs` + `calendar-draft-handoff.mjs`, `camera-calendar-review.mjs`. | No change needed for the tie. | Low |
| 4 | 6 | T8/P12 | 420 s budget; Chromium launched from node:test. | Same as camera-preview-retirement. | Medium |

## Proposed end state
File deleted. `CanonicalCalendarDraftHandoff` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
