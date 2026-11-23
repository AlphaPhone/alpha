# test/quint-canonical-notification-tap-admission.test.mjs
- Lines: 10 | Kind: Quint replay wrapper (model `CanonicalNotificationTapAdmission`, driver `specs/quint/refinement/application/canonical-notification-tap-admission.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: notification taps keep the current renderer commit and exact native token custody. Product code: `main.tsx`, `notifications-adapter.ts`, `connection-ui.tsx`, `AlphaCanonicalNotifications.java`, `AlphaNotificationsPlugin.java`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `canonical-notification-tap-admission.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traceInputs.length===8`, `observedFields.length===21`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/canonical-notification-tap-admission.mjs`): slices and evals TS and Java text (4 slices, 4 evals). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |

## Proposed end state
File deleted. `CanonicalNotificationTapAdmission` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
