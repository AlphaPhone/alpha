# apps/app/src/runtime/maps-contract.ts
- Lines: 1 | Role: `export * from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/approved-read.ts'`. | Verdict: DELETE
- Importers: 1 (`prototype/agent-adapter.ts:59`, `import { isMapsOperation } from '../runtime/maps-contract'`). Text/path pins: `test/support/feature-parity.mjs:553` only (the `maps-contract` hits in `scripts/prepare-client-features.ts:272` are the upstream `plugin-assistant/.../maps-contract.ts`, a different file).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 / A7 | One-line star re-export; one importer using one name. | Delete; `agent-adapter.ts` imports `isMapsOperation` from upstream `plugin-maps/src/client/approved-read.ts` (via `@eliza/*` alias when added); drop `feature-parity.mjs:553`. | None. |

## Local types and helpers
None.

## Proposed end state
File removed.

## Verification
`npm run verify` (type-check, feature-parity); Maps agent-action Playwright journey.
