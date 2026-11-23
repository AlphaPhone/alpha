# specs/quint/refinement/application/maps-reroute-ownership.mjs
- Lines: 180 | Kind: Quint refinement harness (Chromium, production renderer mounted, real controls; `MapsRerouteOwnership`, live) | Verdict: KEEP; move its helpers out of `specs/quint/legacy` (P6)
- Covers: an agent reroute during guidance settles only for the exact guidance session and route request; End/replacement Start retire late success or refusal; a refused live reroute keeps the previous route (`prototype/maps-adapter.ts`, `maps/{state,screen,device-navigation,agent-navigation}.ts`). Duplicates: none. Callers/importers: `test/quint-maps-reroute-ownership.test.mjs` (420 s timeout); aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6 | Imports `geo, mountClosedMaps, route, start` from `specs/quint/legacy/maps/check-maps-refinement.mjs`; this is one of the blockers to retiring `specs/quint/legacy` (network fetch per verify). | Move those four helpers (and their Chromium closed-Maps fixture) to `specs/quint/refinement/application/maps-support.mjs` first, then retire legacy. | M |
| 2 | 31-37 | D11 | Reads `window.inspectHistoricalMaps()` — the observer name says "historical" while it inspects the current renderer. | Rename with the helper move. | L |
| 3 | all | — | Drives real buttons (`End navigation`, `Start`, textbox) in the production renderer — this is already journey-shaped and the strongest kind of harness in this chunk. | Keep. | — |
| 4 | 167-179 | C5 | Bypasses `support.mjs` `boundInputs` (gets `driverHashes` from the legacy helper). | Use `support.mjs` after the move. | L |
| 5 | test wrapper | B5 | Wrapper passes its own path as a relative string and asserts per-case final fields; acceptable but duplicative of `checkTraces`. | Trim to `passed`. | L |
| 6 | runtime | — | Chromium + 7 mounted schedules; slowest harness in the chunk (420 s budget). | Run only when Maps paths change (path→model selection). | — |

## Proposed end state
Same seven schedules; helpers in a live `maps-support.mjs`; `specs/quint/legacy` no longer imported; path-selected in CI.
