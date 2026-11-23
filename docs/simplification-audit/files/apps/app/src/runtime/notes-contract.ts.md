# apps/app/src/runtime/notes-contract.ts
- Lines: 1 | Role: `export *` from upstream `plugins/plugin-notes/src/client/notes-contract.ts`. | Verdict: DELETE (import upstream via alias)
- Importers: 11 — `prototype/agent-adapter.ts:69`, `notes-organize-executor.ts:1`, `notes-query-executor.ts:2`, `notes-trash-adapter.ts:5`, `voice-adapter.ts:22`, `runtime/alpha-client.ts:63`, `device-actions.ts:37`, `device-record-presentation.ts:4`, `notes-organize-contract.ts:1`, `notes-trash-policy.ts:2`, `phone-context.ts:10`; `scripts/test-notes-action-flow.ts:7`.
- Text/path pins: `test/notes-pending-editor.test.mjs` (reads path), `feature-parity.mjs`. (`scripts/prepare-client-features.ts:299` projects the upstream `plugin-assistant` twin, not this file.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4/D13 | pure shim. Note upstream also ships `plugin-assistant/.../notes-contract.ts`; confirm both resolve to one contract. | Rewrite 12 imports to the alias; delete. | Low |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
`npm run verify` (type check), `test/notes-pending-editor.test.mjs`, `scripts/test-notes-action-flow.ts`.
