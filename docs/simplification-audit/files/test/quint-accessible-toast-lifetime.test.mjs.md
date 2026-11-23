# test/quint-accessible-toast-lifetime.test.mjs
- Lines: 10 | Kind: Quint replay wrapper (model `AccessibleToastLifetime`, driver `specs/quint/refinement/application/accessible-toast-lifetime.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: toasts stay up for the Android accessibility timeout the device reports (shell timers in `model.js` + `accessibility-timeout.ts`). Product code: `apps/app/src/prototype/model.js`, `apps/app/src/runtime/accessibility-timeout.ts`, `apps/app/src/main.tsx`, `AlphaDevicePlugin.java`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `accessible-toast-lifetime.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traceInputs.length===12`, `observedFields.length===10`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/accessible-toast-lifetime.mjs`): slices `model.js` ShellTimers by text and strips `accessibility-timeout.ts` into `vm` (research [read]). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |

## Proposed end state
File deleted. `AccessibleToastLifetime` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
This replay is the coverage that chunk test-01 relied on when it deleted `accessibility-timeout.test.mjs`; keep the model.
