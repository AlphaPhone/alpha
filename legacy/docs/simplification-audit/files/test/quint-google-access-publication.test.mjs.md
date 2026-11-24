# test/quint-google-access-publication.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper (calls `checkGoogleAccessPublication` from `specs/quint/refinement/application/google-access-publication.mjs`) | Verdict: DELETE
- Covers: Google access corrective publication keeps the document lock and the original failure (5 traces; `google-agent-access.ts`, `domain-document.ts`). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-10 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | P6 | Driver imports `deferred`/`tick` from `specs/quint/legacy/core/source-support.mjs`. | Move those helpers to `refinement/support.mjs` before retiring legacy. | Medium |

## Proposed end state
Deleted. `GoogleAccessPublication` keeps running once through the application campaign list in the manifest runner.
