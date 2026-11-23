# test/quint-inbox-edit-coalescer.test.mjs
- Lines: 6 | Kind: Quint replay wrapper (calls `runInboxEditCoalescerCase1/2/3` from `specs/quint/refinement/services/inbox-edit-coalescer-replay.mjs`) | Verdict: DELETE
- Covers: the Inbox edit coalescer (`runtime/inbox-edit-coalescer.ts`) follows scenarios and 60 random walks; an armed timer is the only way a waiting copy is written without a caller. Duplicates: `specs/quint/refinement/services/forward-replays.mjs` registers `InboxEditCoalescer` and runs the same replay inside `test/quint-services-refinement.test.mjs`; `runInboxEditCoalescerReplay` (the aggregate entry) runs Case1 and Case2. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-6 | T4, P3 | Same replay executed twice per `npm test`. | Delete the wrapper. | None |
| 2 | 6 | — | Case3 is a concrete regression the aggregate does not run. | Call Case3 from `runInboxEditCoalescerReplay`. | Low |

## Proposed end state
Deleted. `InboxEditCoalescer` runs once through the services forward-replay list in the manifest runner.
