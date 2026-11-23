# test/quint-maps-guidance-voice.test.mjs
- Lines: 15 | Kind: Quint replay wrapper (calls `replayMapsGuidanceVoice` from `specs/quint/refinement/services/maps-guidance-voice.mjs`) | Verdict: DELETE
- Covers: the guidance voice queue (`maps/navigation-voice.ts`) follows MapsGuidanceVoice (7 scenarios, 6 witnesses, 60 walks). Duplicates: `specs/quint/refinement/services/forward-replays.mjs` registers `MapsGuidanceVoice` and runs the same replay inside `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | T4, P3 | Same replay executed twice per `npm test` (300 s budget). | Delete the wrapper. | None |
| 2 | 8-13 | B5 | Pins counts; `console.log` noise. | Gone. | None |

## Proposed end state
Deleted. `MapsGuidanceVoice` runs once through the services forward-replay list in the manifest runner.
