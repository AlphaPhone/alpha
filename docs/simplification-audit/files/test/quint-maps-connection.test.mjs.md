# test/quint-maps-connection.test.mjs
- Lines: 15 | Kind: Quint replay wrapper (calls `replayMapsConnection` from `specs/quint/refinement/services/maps-connection.mjs`) | Verdict: DELETE
- Covers: Cloud Maps connection code follows MapsConnection (8 scenarios, 6 witnesses, 40 walks). Duplicates: `specs/quint/refinement/services/forward-replays.mjs` registers `MapsConnection` and runs the same replay inside `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | T4, P3 | Same replay executed twice per `npm test` (300 s budget). | Delete the wrapper. | None |
| 2 | 8-13 | B5 | Pins scenario/witness counts; `console.log` noise. | Gone. | None |

## Proposed end state
Deleted. `MapsConnection` runs once through the services forward-replay list in the manifest runner.
