# test/quint-modal-toast-forwarding.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper (calls `checkModalToastForwarding` from `specs/quint/refinement/application/modal-toast-forwarding.mjs`) | Verdict: DELETE
- Covers: dialog toast forwarding follows modal order and installation ownership (8 traces; driver strips/slices `main.tsx`, `toast-layer.ts`). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-9 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `ModalToastForwarding` keeps running once through the application campaign list in the manifest runner.
