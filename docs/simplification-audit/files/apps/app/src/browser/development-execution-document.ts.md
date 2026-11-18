# apps/app/src/browser/development-execution-document.ts
- Lines: 25 | Role: per-namespace development execution document holding the actions and workflows sub-states as JSON strings. | Verdict: SIMPLIFY (dev module)
- Importers: 3 (`development-actions.ts:5`, `development-workflows.ts`, `runtime/connection-ui.tsx`). Text/path pins: 13 browser specs (`dev-cloud-identity`, `dev-connection-actions`, `dev-workflow-*`, `execution-storage-migration` (A1), journeys a/b/c, `workflow-*`), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14 | A1 | Legacy reader merging two old `localStorage` keys (`alpha.browser.agent.actions.*`, `alpha.browser.workflows.*`). D1. | Drop with domain-document. Keep the `{actions,workflows}` stored shape. | Low |
| 2 | 10 | C3 | Namespace regex + `!browserDevProfile`. | `assertDevelopmentNamespace`. | None |
| 3 | 17 | B3 (P7) | Shape validation of own writes. | Delete. | Low |
| 4 | 24 | B4 | `if(raw===undefined)throw Error('Development execution cannot be saved.')` — `JSON.stringify` of a state object is never `undefined`. | Delete. | None |
| 5 | 6 | A7 | `ExecutionPart` exported, unused outside. | Drop export. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ExecutionDocument` | type | 5 | none | keep |

## Proposed end state
~16 lines in `dev/`.

## Verification
`test/browser/dev-workflow-execution.spec.ts`, `dev-connection-actions.spec.ts`, journeys a/b/c.
