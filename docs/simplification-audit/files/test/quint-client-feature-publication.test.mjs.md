# test/quint-client-feature-publication.test.mjs
- Lines: 23 | Kind: Quint refinement wrapper (calls `checkClientFeaturePublication` from `specs/quint/refinement/services/client-feature-publication.mjs`) | Verdict: DELETE
- Covers: publishing `.eliza/client-features` from the pinned upstream (`committed-source.mjs`, `immutable-workspace-source.mjs`) refines the publication model (1 trace, 16 checkpoints). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-17 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 20-22 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 8-17 | T9 | Builds the test program in a template string and runs it with `node --import=tsx -e`; assertions run in the child, not under node:test. | Gone with the file. | None |
| 4 | — | P1 | The model only covers upstream scripts and `upstream.lock.json`, yet runs on every PR. | Runner: select this campaign only when `upstream.lock.json`, `scripts/upstream*` or the driver change. | Low |

## Proposed end state
Deleted. `ClientFeaturePublication` keeps running once through the services campaign list in the manifest runner.
