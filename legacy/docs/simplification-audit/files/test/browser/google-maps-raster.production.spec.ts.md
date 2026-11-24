# test/browser/google-maps-raster.production.spec.ts
- Lines: 158 | Kind: Playwright (`production` project, flag-off bundle), real UI journey over an inline bridge fake | Verdict: **MERGE** into `journeys/maps.spec.ts`
- Covers: Maps with a Google raster provider: attribution image and recipient disclosure, tile requests carry UUID idempotency keys, "No imagery" when the provider has no map, copyright-unavailable and malformed-tile error states, credit/disclosure panels stay on screen at four viewport/text-scale layouts, results sheet does not cover credits, route + navigation start with live location. Duplicates: `managed-maps-unavailable.production.spec.ts` (unavailable state), `maps-legacy-provenance.production.spec.ts` (attribution). Callers/importers: imports `flag-off-android` (`flagOffAndroid`, `residentHome`, `button`) and `resident-stub` (`residentStub`). 4 tests (loop over tile modes).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | P17 | `test.skip(info.project.name!=='production')` is unreachable: the `production` project's `testMatch` already selects only this file name pattern. | Delete. | none |
| 2 | 13-49 | P6, T7 | Hand-written `PluginHeaders.push` + `nativePromise` override for `ElizaSense`, `ElizaLocation`, `AlphaMapsTransport` and the `AlphaConnection` maps routes. | `harness/plugins/maps.ts` (provider capabilities/tiles/routes/places with a `tiles` mode option) and `harness/plugins/location.ts`. | Low. |
| 3 | 7, 10, 157 | T8 | `video:'on'` for every run, `setTimeout(120_000)`, an unconditional final screenshot nobody reads. | Default timeout; video/screenshots only on failure. | none |
| 4 | 95-133 | T7 | The credit layout check runs four layouts twice (results and navigation) with `addStyleTag` overriding the text-scale probe. Valuable (only coverage of credit clipping), but heavy. | Keep, as a `layouts` step parameterised from `harness/text-scale.ts`; run two layouts in the PR lane, four nightly. | Low. |
| 5 | 151 | T6 | `window.flagOff.emit('ElizaLocation','locationChange',…)` pushes a location fix through the global fixture bag. | `harness.location.emit(fix)`. | none |

## Proposed end state
`journeys/maps.spec.ts` (production) keeps four short tests: Google provider with attribution/disclosure and route +
navigation; credits fit at enlarged and landscape layouts; no imagery (search still works, coordinate place can be
saved); provider error states (copyright unavailable, malformed tile). No skip guard, default timeouts, fixtures from
`harness/plugins/maps.ts`. Delete this file once merged.
