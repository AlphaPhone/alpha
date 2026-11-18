# specs/quint/application/AccessibleToastLifetime.qnt
- Lines: 114 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP model; PORT harness
- Covers: Shell toast queue: undo toasts keep their slot, passive notices coalesce, focus hold freezes the timer, and only the latest native accessibility-timeout read sets the scale used for new toasts. Models: `apps/app/src/runtime/accessibility-timeout.ts`, `prototype/model.js` (`toastQueue`, `scheduleToast`, `closeToast`), `main.tsx`, `AlphaDevicePlugin.java` — all exist; symbols present. Duplicates: `test/quint-accessible-toast-lifetime.test.mjs` and the application aggregate both run `checkAccessibleToastLifetime` (T4); `test/accessibility-timeout.test.mjs` (stub unit test, slated DELETE) covers the same module. Callers/importers: manifest entry with 9 tests and 3 witnesses; `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/accessible-toast-lifetime.mjs` (wrapper `test/quint-accessible-toast-lifetime.test.mjs` and `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`)); also mentioned in `native/manifest.json` / READMEs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 16-20 | T10 / T2 | Harness slices `prototype/model.js` between the literal anchors `'  later(fn, ms, grp)'` and `'  /* ---- per-app state ---- */'`, asserts the import line by regex, strips types and evals in `vm`. | PORT: export the timer/toast queue (`ShellTimers` + `scheduleToast`/`closeToast`) from a module (it moves out of `model.js` in the D1 split anyway) and import it; keep `accessibility-timeout.ts` imported directly. | Medium: breaks on the first `model.js` reformat (D9 Prettier). |
| 2 | — | T4 | Run twice per `npm test` (wrapper + aggregate). | One manifest-driven runner (chunk cross-file action). | Low |
| 3 | 75-78 | — | `toastOwnership` quantifies over `Replies` to accept any past scale; fine. | Keep. | — |

## Proposed end state
Model unchanged (114 lines). Harness imports an exported toast queue instead of slicing `model.js`; runs once.
