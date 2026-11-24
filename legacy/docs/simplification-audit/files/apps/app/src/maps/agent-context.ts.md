# apps/app/src/maps/agent-context.ts
- Lines: 1 | Role: pure `export *` re-export of `.eliza/client-features/plugins/plugin-maps/src/client/agent-context.ts` | Verdict: DELETE (after the `@eliza/*` alias lands; importers import upstream directly)
- Importers: 5 app (prototype/agent-adapter.ts:60,74, prototype/maps-adapter.ts:28, runtime/device-actions.ts:43, runtime/phone-context.ts:12); test/browser/maps-approved-read.spec.ts (5 `await import('/src/maps/agent-context.ts')` sites, lines 98-138).
- Text/path pins: test/support/feature-parity.mjs:313 (modules inventory); test/browser/maps-approved-read.spec.ts imports the URL path `/src/maps/agent-context.ts` in-page (T6) — change to `/.eliza/client-features/plugins/plugin-maps/src/client/agent-context.ts`. No quint manifest pins.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/agent-context.ts';` adds a hop with no behaviour | Rewrite every importer to the upstream module (via the proposed `@eliza/plugin-maps/src/client/agent-context.ts` alias), then delete the file | Low for app code; medium for the path pins listed above, which must be edited in the same commit |
| 2 | 1 | D13 | Four-level relative path into the generated tree | Replaced by the alias (cross-file action in the chunk summary) | Low |

## Local types and helpers
None.

## Proposed end state
File deleted. Each importer imports `agent-context.ts` from the upstream plugin through one alias. The `test/support/feature-parity.mjs` `modules` inventory loses this path; any `specs/quint/**/manifest.json` `sources` entry is pointed at the upstream path (or dropped if the model only covers Alpha code). Estimated lines after: 0.

## Verification
test/browser/maps-approved-read.spec.ts; host tests covering device-actions/phone-context (`test/device-actions*.test.mjs`, `test/phone-context*.test.mjs` if present); `npm run verify` (typecheck + feature-parity test).
