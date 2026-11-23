# apps/app/src/maps/route-distance.ts
- Lines: 1 | Role: pure `export *` re-export of `.eliza/client-features/plugins/plugin-maps/src/client/route-distance.ts` | Verdict: DELETE (after the `@eliza/*` alias lands; importers import upstream directly)
- Importers: 2 app (browser/workflow-location.ts:4, browser/workflow-trigger-runtime.ts:7); scripts/test-maps-reroute-freshness.ts:11; test/maps-route-distance.test.mjs:4.
- Text/path pins: specs/quint/native/manifest.json:627 (sources); test/support/feature-parity.mjs:328.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/route-distance.ts';` adds a hop with no behaviour | Rewrite every importer to the upstream module (via the proposed `@eliza/plugin-maps/src/client/route-distance.ts` alias), then delete the file | Low for app code; medium for the path pins listed above, which must be edited in the same commit |
| 2 | 1 | D13 | Four-level relative path into the generated tree | Replaced by the alias (cross-file action in the chunk summary) | Low |

## Local types and helpers
None.

## Proposed end state
File deleted. Each importer imports `route-distance.ts` from the upstream plugin through one alias. The `test/support/feature-parity.mjs` `modules` inventory loses this path; any `specs/quint/**/manifest.json` `sources` entry is pointed at the upstream path (or dropped if the model only covers Alpha code). Estimated lines after: 0.

## Verification
test/maps-route-distance.test.mjs (itself a T3 candidate for an upstream pure function — it re-tests upstream code, T5); scripts/test-maps-reroute-freshness.ts.
