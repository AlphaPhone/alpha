# apps/app/src/maps/background-navigation.ts
- Lines: 1 | Role: pure `export *` re-export of `.eliza/client-features/plugins/plugin-maps/src/client/background-navigation.ts` | Verdict: DELETE (after the `@eliza/*` alias lands; importers import upstream directly)
- Importers: 1 app (prototype/maps-adapter.ts:3); test/maps-navigation.test.mjs (4 dynamic imports, lines 69-148).
- Text/path pins: specs/quint/native/manifest.json:626 and specs/quint/services/manifest.json:406 (sources lists); specs/quint/refinement/native/navigation-progress.mjs:32 compiles `export {BackgroundNavigation} from './apps/app/src/maps/background-navigation.ts'` (T10); test/maps-navigation.test.mjs:69,119,133,148; test/support/feature-parity.mjs:315.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/background-navigation.ts';` adds a hop with no behaviour | Rewrite every importer to the upstream module (via the proposed `@eliza/plugin-maps/src/client/background-navigation.ts` alias), then delete the file | Low for app code; medium for the path pins listed above, which must be edited in the same commit |
| 2 | 1 | D13 | Four-level relative path into the generated tree | Replaced by the alias (cross-file action in the chunk summary) | Low |

## Local types and helpers
None.

## Proposed end state
File deleted. Each importer imports `background-navigation.ts` from the upstream plugin through one alias. The `test/support/feature-parity.mjs` `modules` inventory loses this path; any `specs/quint/**/manifest.json` `sources` entry is pointed at the upstream path (or dropped if the model only covers Alpha code). Estimated lines after: 0.

## Verification
test/maps-navigation.test.mjs; quint refinement navigation-progress (native group); `npm run verify`.
