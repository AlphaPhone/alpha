# specs/quint/application/AppearancePreferenceAdmission.qnt
- Lines: 160 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP model; PORT harness
- Covers: Theme preference: production ignores the `?theme` query, a development preview pins the boot theme, queued storage reads cannot echo a write, Settings writes once, a failed write keeps the stored choice, unmounted listeners ignore events. Models: `apps/app/src/main.tsx`, `prototype/settings-adapter.ts`, `prototype/model.js` (exist). Duplicates: `test/appearance-preference.test.mjs` (transplant via the same fixture, slated DELETE). Callers/importers: manifest (6 tests); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/appearance-preference-admission.mjs` (uses `test/fixtures/appearance-preference.mjs`) via `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`) (no own wrapper).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | fixture 14-43 | T10 / T2 | The fixture reads `settings-adapter.ts`, `main.tsx` and the shell source, slices between literal anchors (e.g. `'    let lastBinding ='`), strips types and evals. | PORT: move the appearance preference logic (read/resolve/write + listeners) into one module (e.g. `runtime/appearance.ts`) used by both `main.tsx` and Settings, and import it. | Medium: anchors in three god files. |
| 2 | 5-8 | — | State holds both model state and presentation (`displayed`, `selection`) recomputed by `present`; fine for refinement. | Keep. | — |

## Proposed end state
Model unchanged. Harness imports an appearance module; the transplant fixture and `test/appearance-preference.test.mjs` are deleted.
