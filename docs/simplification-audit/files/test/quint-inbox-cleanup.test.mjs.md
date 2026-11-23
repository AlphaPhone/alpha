# test/quint-inbox-cleanup.test.mjs
- Lines: 24 | Kind: Quint refinement wrapper (calls `runInboxCleanupRefinement` from `specs/quint/refinement/services/inbox-cleanup.mjs`) | Verdict: DELETE
- Covers: Inbox cleanup checks each durable write, lost reply, stale binding and peer save (9 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-20 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 10-18 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 6-23 | T9 | `node --input-type=module -e` child program; asserts on stdout `/"traces":9/`. | Gone. | None |

## Proposed end state
Deleted. `InboxCleanup` keeps running once through the services campaign list in the manifest runner.
