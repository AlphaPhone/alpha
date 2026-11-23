# test/quint-camera-preview-retirement.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `CameraPreviewRetirement`, driver `specs/quint/refinement/application/camera-preview-retirement.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: mounted Camera retires its preview correctly across the Home commit. Product code: `camera-adapter.ts`, `browser-camera.ts`, `model.js`, `template.html`, upstream `plugin-native-camera/src/session.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `camera-preview-retirement.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===3`, `checkpoints>=24`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/camera-preview-retirement.mjs`): mounts via `test/fixtures/calendar-mounted-editor.mjs` (launches real Chromium from node:test, research P12) and `camera-preview-port.mjs`. | No change needed for the tie. | Low |
| 4 | 6 | T8/P12 | 240 s budget; starts a Chromium from inside `node --test`. | Either keep in the runner with a Playwright-provided browser, or move this replay to the Playwright project. | Medium |

## Proposed end state
File deleted. `CameraPreviewRetirement` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
