# test/quint-client-observation-support.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper (calls `checkClientObservationSupport` from `specs/quint/refinement/application/client-observation-support.mjs`) | Verdict: DELETE
- Covers: optional observation support needs a live session and a fresh matching peer (`runtime/client-observation-support.ts`, `connection-ui.tsx`; 21 traces). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-13 | B5 | Exact trace count and a literal list of nine observed state fields; adding a model variable breaks the wrapper. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `ClientObservationSupport` keeps running once through the application campaign list in the manifest runner.
