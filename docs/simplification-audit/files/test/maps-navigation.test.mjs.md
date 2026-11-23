# test/maps-navigation.test.mjs
- Lines: 216 | Kind: mixed: upstream suite re-run (8-15), unit of `maps/guidance.ts` (17-54), unit of `BackgroundNavigation` with a bridge fake (56-163), inline Python unit of `serve-region.py` (101-116), integration of Cloud Maps coverage (167-216) | Verdict: MERGE 167-216 into `test/integration/maps.test.mjs`; DELETE the rest (one Python case moves)
- Covers: turn-by-turn guidance text, screen-off navigation session ownership, gateway maneuver mapping, and agent Maps coverage across account changes. Duplicates: Quint `specs/quint/refinement/native/navigation-progress.mjs` runs the real `BackgroundNavigation`, `guidance` and screen controller; `scripts/test-maps-reroute-freshness.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | T5 | Runs upstream `plugin-maps/test/navigation-client.test.mjs`. | Delete. | Low |
| 2 | 17-54 | T3 / T4 | Pure guidance formatting and `atStep`; navigation-progress refinement executes them. | Delete; one visible guidance banner assertion belongs in `journeys/maps.spec.ts` (dev-location). | Low |
| 3 | 56-163 | T3 / T4 | `BackgroundNavigation` stop-once/update/late-failure cases with a hand fake; same class runs in the navigation-progress refinement. | Delete after confirming the refinement observes stop-once and late-failure; else carry those two cases into the refinement. | Medium |
| 4 | 101-116 | T9 / C7 | Python source in a JS template string, with a stubbed module. | Move to `scripts/maps` Python tests (see `maps-dataset-manifest.test.mjs.md`). | Low |
| 5 | 167-216 | - | Real `cloud-provider`, `cloud-session`, `agent-navigation` together: one read per account, retire on change, nothing on sign-out. Runs as `-e` script in a child to get tsx. | Keep as a normal test in `test/integration/maps.test.mjs` under the shared loader. | Low |

## Proposed end state
File deleted. The agent-coverage case lives in `test/integration/maps.test.mjs`; guidance and background session are
covered by the navigation-progress refinement and the maps journey.
