# test/appearance-preference.test.mjs
- Lines: 50 | Kind: transplant (via `test/fixtures/appearance-preference.mjs`) + Quint refinement call | Verdict: DELETE
- Covers: a `?theme=` query in a non-test-mocks build cannot override the saved System/Light/Dark choice; test-mocks preview keeps its theme; the appearance Quint refinement passes with 11 traces. Duplicates: `specs/quint/refinement/application/index.mjs:56` already runs `checkAppearancePreferenceAdmission` in the application refinement aggregate (T4); `test/browser/appearance-storage.spec.ts` (8 tests) drives appearance storage in a real page. Callers/importers: run by `npm test` (`scripts/run-node-tests.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 6-43 | T2 | The fixture slices `settings-adapter.ts`, `main.tsx` and `model.js` between text anchors (`range(source,start,end)`), strips types and runs them in `vm` with fake listeners. | Delete the three fixture tests. Carry "a `?theme=` query in a production build does not change or store the appearance" into `journeys/settings.spec.ts` (production project). | Low |
| 2 | 45-50 | T4, B5 | Runs the same Quint refinement the aggregate runs, then asserts an exact trace count (`traces, 11`). | Delete; the aggregate is the one run. | Low |
| 3 | 3 | — | `test/fixtures/appearance-preference.mjs` importers: this test and `specs/quint/refinement/application/appearance-preference-admission.mjs`. It survives this delete only because the harness uses it; that harness slices source text (T10) and must be PORTed to import the real settings/appearance module, after which the fixture goes. | Log for the formal port. | Med |

## Proposed end state
File deleted. Query-override and stored-choice behaviour lives in `journeys/settings.spec.ts` (chromium + production). The Quint appearance model keeps passing through the application refinement aggregate; its harness is ported to import the appearance module instead of slicing `settings-adapter.ts`/`main.tsx`/`model.js`.
