# apps/app/src/maps/screen.ts
- Lines: 1 | Role: pure `export *` re-export of `.eliza/client-features/plugins/plugin-maps/src/client/maps-screen.ts` | Verdict: DELETE (after the `@eliza/*` alias lands; importers import upstream directly)
- Importers: 1 app (prototype/maps-adapter.ts:31); scripts/test-maps-reroute-freshness.ts:16.
- Text/path pins: specs/quint/application/manifest.json:2837, specs/quint/native/manifest.json:632, specs/quint/services/manifest.json:409,4505 (sources); specs/quint/refinement/native/navigation-progress.mjs:31 and specs/quint/refinement/services/maps-screen-source.mjs:24,26 compile this exact path (T10); test/support/feature-parity.mjs:331. Note the local name `screen.ts` differs from the upstream `maps-screen.ts` (D11).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/maps-screen.ts';` adds a hop with no behaviour | Rewrite every importer to the upstream module (via the proposed `@eliza/plugin-maps/src/client/maps-screen.ts` alias), then delete the file | Low for app code; medium for the path pins listed above, which must be edited in the same commit |
| 2 | 1 | D13 | Four-level relative path into the generated tree | Replaced by the alias (cross-file action in the chunk summary) | Low |

## Local types and helpers
None.

## Proposed end state
File deleted. Each importer imports `maps-screen.ts` from the upstream plugin through one alias. The `test/support/feature-parity.mjs` `modules` inventory loses this path; any `specs/quint/**/manifest.json` `sources` entry is pointed at the upstream path (or dropped if the model only covers Alpha code). Estimated lines after: 0.

## Verification
Quint navigation-progress and maps-screen refinements; scripts/test-maps-reroute-freshness.ts; `npm run verify`.
