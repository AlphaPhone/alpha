# test/quint-canonical-notes-draft.test.mjs
- Lines: 15 | Kind: Quint replay wrapper (model `CanonicalNotesDraft`, driver `specs/quint/refinement/application/canonical-notes-draft.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: canonical Notes draft snapshots and queued edits follow the editor model. Product code: upstream `.eliza/client-features/plugins/plugin-notes/src/client/notes-editor.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `canonical-notes-draft.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===29`, 8 trace names; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/canonical-notes-draft.mjs`): esbuild-bundles the upstream editor (1 slice). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | driver | P5/P6 | Only product source is the **upstream** notes editor (generated `.eliza`). Models upstream-only code. | Owner/upstream follow-up (D14): keep while Alpha ships it unchanged; move upstream later. | Low |

## Proposed end state
File deleted. `CanonicalNotesDraft` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
