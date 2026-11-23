# apps/app/src/maps/runtime.ts
- Lines: 1 | Role: pure `export *` re-export of `.eliza/client-features/plugins/plugin-maps/src/client/runtime.ts` | Verdict: DELETE (after the `@eliza/*` alias lands; importers import upstream directly)
- Importers: 1 app (prototype/maps-adapter.ts:30) plus maps/cloud-maps.ts:3 and maps/regional-provider.ts:5 inside the folder; ~9 browser specs import `/src/maps/runtime.ts` in-page to call `configureMapsProvider` (calendar-maps-handoff, dev-maps-voice, global-basemap, journey-j04-schedule-travel, maps-approved-read, maps-event-return, maps-list-focus, owner-maps-attribution-refusals, upstream-map-plane).
- Text/path pins: specs/quint/legacy/maps/check-maps-refinement.mjs:28 and specs/quint/refinement/services/maps-connection.mjs:45 (URL/path pins); specs/quint/services/manifest.json:4388; test/support/feature-parity.mjs:329; the 9 browser specs above (T6 backdoor seeding — the research report's "~100 matches").

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/runtime.ts';` adds a hop with no behaviour | Rewrite every importer to the upstream module (via the proposed `@eliza/plugin-maps/src/client/runtime.ts` alias), then delete the file | Low for app code; medium for the path pins listed above, which must be edited in the same commit |
| 2 | 1 | D13 | Four-level relative path into the generated tree | Replaced by the alias (cross-file action in the chunk summary) | Low |

## Local types and helpers
None.

## Proposed end state
File deleted. Each importer imports `runtime.ts` from the upstream plugin through one alias. The `test/support/feature-parity.mjs` `modules` inventory loses this path; any `specs/quint/**/manifest.json` `sources` entry is pointed at the upstream path (or dropped if the model only covers Alpha code). Estimated lines after: 0.

## Verification
All 9 browser specs listed; quint maps-connection refinement; `npm run verify`. Because the browser specs import the module by URL, deleting the shim requires a page-module helper (test/browser/helpers/page-modules.ts) entry or a rewrite of those specs as journeys (T6).
