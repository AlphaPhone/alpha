# apps/app/src/maps/guidance.ts
- Lines: 1 | Role: pure `export *` re-export of `.eliza/client-features/plugins/plugin-maps/src/client/guidance.ts` | Verdict: DELETE (after the `@eliza/*` alias lands; importers import upstream directly)
- Importers: 2 app (prototype/maps-chat-adapter.ts:2, runtime/action-message-presentation.ts:2); scripts/test-maps-reroute-freshness.ts:12; test/maps-navigation.test.mjs:18,40.
- Text/path pins: specs/quint/native/manifest.json:624, specs/quint/services/manifest.json:352,401 (sources); test/support/feature-parity.mjs:322.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/guidance.ts';` adds a hop with no behaviour | Rewrite every importer to the upstream module (via the proposed `@eliza/plugin-maps/src/client/guidance.ts` alias), then delete the file | Low for app code; medium for the path pins listed above, which must be edited in the same commit |
| 2 | 1 | D13 | Four-level relative path into the generated tree | Replaced by the alias (cross-file action in the chunk summary) | Low |

## Local types and helpers
None.

## Proposed end state
File deleted. Each importer imports `guidance.ts` from the upstream plugin through one alias. The `test/support/feature-parity.mjs` `modules` inventory loses this path; any `specs/quint/**/manifest.json` `sources` entry is pointed at the upstream path (or dropped if the model only covers Alpha code). Estimated lines after: 0.

## Verification
test/maps-navigation.test.mjs; scripts/test-maps-reroute-freshness.ts; `npm run verify`.
