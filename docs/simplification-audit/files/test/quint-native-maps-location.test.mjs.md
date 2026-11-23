# test/quint-native-maps-location.test.mjs
- Lines: 15 | Kind: Quint replay wrapper (calls `replayNativeMapsLocation` from `specs/quint/refinement/native/maps-location.mjs`) | Verdict: DELETE
- Covers: the Maps location owner (`maps/native-location.ts`) follows NativeMapsLocation (11 scenarios, 8 witnesses, 60 walks). Duplicates: `specs/quint/refinement/native/forward-replays.mjs` registers `NativeMapsLocation` and runs the same replay inside `test/quint-native-refinement.test.mjs`; `owningAssertions` there repeats the trace count, action list and checkpoint floor. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | T4, P3 | Same replay executed twice per `npm test` (300 s). | Delete the wrapper. | None |
| 2 | 11 | Hygiene | `console.log` noise. | Gone. | None |

## Proposed end state
Deleted. `NativeMapsLocation` runs once through the native forward-replay list in the manifest runner.
