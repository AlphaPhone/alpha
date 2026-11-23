# apps/app/src/runtime/note-dates.ts
- Lines: 1 | Role: `export * from` upstream `plugins/plugin-notes/src/client/note-dates.ts`. | Verdict: DELETE (import upstream through the `@elizaos/*` alias)
- Importers: `prototype/agent-adapter.ts:56`.
- Text/path pins: `specs/quint/refinement/application/notes-coordinator.mjs:18` (`export {stampNoteChanges} from './apps/app/src/runtime/note-dates.ts'`), `test/browser/dev-workflow-dates.spec.ts` (imports the path), `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4/D13 | pure pass-through shim with a deep `.eliza` relative path. | Point agent-adapter, the Quint harness and the spec at the upstream module (alias); delete. | Low |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
`notes-coordinator` Quint refinement, `test/browser/dev-workflow-dates.spec.ts`, `npm run verify`.
