# apps/app/src/maps/cloud-session.ts
- Lines: 1 | Role: pure `export *` re-export of `.eliza/client-features/plugins/plugin-maps/src/client/cloud-session.ts` | Verdict: DELETE (after the `@eliza/*` alias lands; importers import upstream directly)
- Importers: 0 app files import it directly (only maps/cloud-maps.ts:2 inside this folder); scripts/test-cloud-maps.ts:9; test/maps-navigation.test.mjs:171 (inside an esbuild stdin string).
- Text/path pins: specs/quint/services/manifest.json:405,4387 (sources); test/maps-navigation.test.mjs:171; scripts/test-cloud-maps.ts:9; test/support/feature-parity.mjs:319.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/cloud-session.ts';` adds a hop with no behaviour | Rewrite every importer to the upstream module (via the proposed `@eliza/plugin-maps/src/client/cloud-session.ts` alias), then delete the file | Low for app code; medium for the path pins listed above, which must be edited in the same commit |
| 2 | 1 | D13 | Four-level relative path into the generated tree | Replaced by the alias (cross-file action in the chunk summary) | Low |

## Local types and helpers
None.

## Proposed end state
File deleted. Each importer imports `cloud-session.ts` from the upstream plugin through one alias. The `test/support/feature-parity.mjs` `modules` inventory loses this path; any `specs/quint/**/manifest.json` `sources` entry is pointed at the upstream path (or dropped if the model only covers Alpha code). Estimated lines after: 0.

## Verification
scripts/test-cloud-maps.ts (via its test shim); test/maps-navigation.test.mjs; test/cloud-maps-session.test.mjs (loads cloud-maps.ts with stubbed imports — check its stub keys, it may key on the './cloud-session' specifier); quint maps-connection refinement.
