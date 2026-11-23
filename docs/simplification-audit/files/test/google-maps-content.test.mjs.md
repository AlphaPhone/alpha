# test/google-maps-content.test.mjs
- Lines: 132 | Kind: unit (esbuild-bundles the real `apps/app/src/maps/cloud-provider.ts`, `saved-places.ts`, `state.ts` into `data:` modules; backend, location and storage are hand-written stubs) | Verdict: REWRITE as cases in `journeys/maps.spec.ts`
- Covers: Google Maps content-policy rules: Google-sourced places cannot be saved or used as a routing origin, manual pins and regional results stay usable, a provider change clears a provider origin but keeps an explicit one. Duplicates: `test/browser/maps-legacy-provenance.production.spec.ts` (legacy saved-row refusal, same rule through the UI); `google-maps-raster.production.spec.ts` covers Google tiles only. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | C3 / T3 | Private esbuild `load()` helper (one of ~60 `data:` loaders, see tests-host.md "source module loader"); every case is a unit call with a stubbed backend. | Delete with the file. | Low |
| 2 | 89-97, 57, 104, 142 | A1 | "Existing saved rows remain readable" and `unknown-legacy-source`/`unknown-legacy` rows model Google content saved before the policy. The renamed package starts with empty data, so such rows cannot exist (D1). | Do not carry. If `SavedPlaces` keeps a reader branch for them, delete it with this case. | Low |
| 3 | 76-87, 99-115 | — | Real policy (Maps ToS: no durable Google content, no Google coordinates sent to another provider). Worth one journey each. | Carry to `journeys/maps.spec.ts`: (a) search result from a Google-sourced connection shows no Save action / Save refused and nothing written to `alpha.maps.saved-places.v1`; (b) a manual pin saves and routes; (c) switching provider clears a provider-picked origin, keeps a typed one. | Medium: only host coverage of (a) and (c) today |
| 4 | 47-54, 130-147 | T3 | `isGoogleMapsCoverage`/`isLocalMapsPlace` truth tables with a fake `current()` snapshot. | Drop; the journey cases exercise these predicates through the UI. | Low |

## Proposed end state
File deleted. `journeys/maps.spec.ts` gains three cases on the existing Maps harness (resident stub with a configurable
`providerId`/`sources.data`): Google content not saveable, manual place saves and routes, provider change clears the
provider origin. `maps-legacy-provenance.production.spec.ts` is reviewed in its own chunk for the same A1 reason.
