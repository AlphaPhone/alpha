# test/quint-inbox-list-paging.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper (calls `checkInboxListPaging` from `specs/quint/refinement/services/inbox-list-paging.mjs`) | Verdict: DELETE
- Covers: Inbox list paging keeps cursor and selection guards with prefetch (15 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-11 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 10-11 | B5 | Asserts coverage bookkeeping (3 witnesses, 2 canaries, 6 named scenarios). | Gone. | None |

## Proposed end state
Deleted. `InboxListPaging` keeps running once through the services campaign list in the manifest runner.
