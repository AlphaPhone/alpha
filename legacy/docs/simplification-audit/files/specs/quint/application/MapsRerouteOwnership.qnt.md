# specs/quint/application/MapsRerouteOwnership.qnt
- Lines: 91 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (legacy helpers)
- Covers: agent reroute during guidance: one watch per guidance session, route publication exact, late agent replies retired for a replacement session (`prototype/maps-adapter.ts`, `maps/{state,screen,device-navigation,agent-navigation}.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `maps-reroute-ownership.mjs` via `test/quint-maps-reroute-ownership.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 4 | P6 | Imports `geo, mountClosedMaps, route, start` from `specs/quint/legacy/maps/check-maps-refinement.mjs`; blocks retiring `specs/quint/legacy`. | Move those four helpers to `refinement/application/maps-support.mjs` (or `services/maps-model-traces.mjs`) first. | M |
| 2 | manifest | — | Pins both local `apps/app/src/maps/*` and `vendor/eliza/plugins/plugin-maps/*` twins + `upstream.lock.json`. | Keep only the files the harness loads. | L |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports helpers from a live support module; legacy folder deletable.
