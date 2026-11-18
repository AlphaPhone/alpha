# apps/app/src/maps/device-navigation.ts
- Lines: 1 | Role: pure `export *` re-export of `.eliza/client-features/plugins/plugin-maps/src/client/device-navigation.ts` | Verdict: DELETE (after the `@eliza/*` alias lands; importers import upstream directly)
- Importers: 0 app files outside the folder (maps/resident-relay.ts:4 only); scripts/test-maps-device-navigation.ts:7, scripts/test-maps-reroute-freshness.ts:15.
- Text/path pins: specs/quint/application/manifest.json:2838, specs/quint/native/manifest.json:630, specs/quint/services/manifest.json:348,397,4507 (sources); specs/quint/refinement/services/maps-screen-source.mjs:24-26 and specs/quint/refinement/services/maps.mjs:28,31 load this exact path (T10); test/support/feature-parity.mjs:321.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/device-navigation.ts';` adds a hop with no behaviour | Rewrite every importer to the upstream module (via the proposed `@eliza/plugin-maps/src/client/device-navigation.ts` alias), then delete the file | Low for app code; medium for the path pins listed above, which must be edited in the same commit |
| 2 | 1 | D13 | Four-level relative path into the generated tree | Replaced by the alias (cross-file action in the chunk summary) | Low |

## Local types and helpers
None.

## Proposed end state
File deleted. Each importer imports `device-navigation.ts` from the upstream plugin through one alias. The `test/support/feature-parity.mjs` `modules` inventory loses this path; any `specs/quint/**/manifest.json` `sources` entry is pointed at the upstream path (or dropped if the model only covers Alpha code). Estimated lines after: 0.

## Verification
scripts/test-maps-device-navigation.ts, scripts/test-maps-reroute-freshness.ts; quint services maps / maps-screen refinements; `npm run verify`.
