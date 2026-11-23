# test/maps-reroute-freshness.test.mjs
- Lines: 9 | Kind: wrapper (T9) spawning `scripts/test-maps-reroute-freshness.ts` (134 lines; uses `scripts/fixtures/prototype-script.ts` to transplant `maps-adapter.ts`) | Verdict: DELETE (wrapper and script); REWRITE the behaviour as a case in `journeys/maps.spec.ts`
- Covers: rerouting keeps the current route when the location fix becomes unusable. Duplicates: Quint `specs/quint/refinement/native/navigation-progress.mjs` (same controllers). Callers/importers: `npm test` glob; script has no other caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-9 | T9 | Child-suite wrapper that also has to strip `NODE_TEST_CONTEXT`. | Delete. | None |
| 2 | script | T2 | `prototypeScript('maps-adapter.ts', 'installPrototypeMapsAdapter')` evals the adapter with fixture render state. | Delete; one journey case with the dev location fake: start directions, make the fix stale/off-route, press Reroute, route stays and a message explains. | Medium |

## Proposed end state
Both files deleted; reroute freshness is a `journeys/maps.spec.ts` case using the dev-location helper.
