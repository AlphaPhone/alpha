# test/quint-view-admission.test.mjs
- Lines: 54 | Kind: Quint replay with inline driver (real imports) + source regexes | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: ViewAdmission traces against image Contacts admission (`runtime/image-contacts.ts`) and the enabled/deferred view sets (`prototype/mvp-features.ts`). Duplicates: `test/image-contacts-admission.test.mjs` tests the same admission step. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-16 | good | Imports the real modules through `sourceModule` with two stubbed specifiers. | Keep this shape; move driver to `specs/quint/refinement/application/view-admission.mjs`. | Low |
| 2 | 18-20 | T1 | Regexes over `model.js` and `main.tsx` pin the two call sites the stand-in shell repeats. | Delete; the shell stand-in is acceptable as a port. | Low |
| 3 | 51-52 | T5 | Negative projection canary. | Drop (checker failure is proven in tooling). | Low |

## Proposed end state
- Driver in specs; runner row; `image-contacts-admission` reviewed for deletion as duplicate.
