# test/browser/maps-legacy-provenance.production.spec.ts
- Lines: 62 | Kind: Playwright production journey with seeded storage, project `production`, 2 tests | Verdict: **MERGE** into `journeys/maps.spec.ts` (production block), renamed; not a legacy-data test
- Covers: saved places that came from a Google provider (`eliza-cloud-google`, custom Google) are shown without a basemap, credits or Share/Rename/Directions when the current coverage is unavailable or non-Google, and can only be removed; a manual pin keeps all actions; tile credits stay behind the info disclosure. Duplicates: none; complements `google-maps-raster.production.spec.ts`. Callers/importers: none; imports `flag-off-android.ts`, `resident-stub.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | D11 | Named "legacy" but the behaviour is live: `maps-adapter.ts:61-66` and `maps/saved-places.ts:9-14` restrict Google-sourced content whenever coverage is not Google. Coverage can change on a fresh install, so it is not a migration path (research row 859 suggested delete; that is wrong). | Keep; rename to "Google-sourced saved places under non-Google coverage". | Low |
| 2 | 14-18 | T6 (storage seed) | Seeds `alpha.maps.saved-places.v1` in `localStorage` directly, pinning the storage format in the test. | Prefer saving the places through the UI under Google coverage, then switching coverage. If that costs too much, keep the seed as the one storage-contract fixture for this key. | Low |
| 3 | 19, 21 | C3 | `ElizaSense` header and answer copied from `managed-maps-unavailable.production.spec.ts`. | Default in `residentStub`. | none |

## Proposed end state
One parameterised test (unavailable / non-Google coverage) in the production block of `journeys/maps.spec.ts`, with an
honest name. It uses the shared Maps capability fixture (the same one as `managed-maps-unavailable`). The places are saved through the UI
where possible.
