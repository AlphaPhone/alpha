# apps/app/src/runtime/automations-route-policy.ts
- Lines: 11 | Role: `assertAutomationRequestAllowed` (owner route table check for Automations) and the `AutomationRequestNotDispatchedError` class | Verdict: MERGE into `apps/app/src/runtime/owner-route-policy.ts`
- Importers: runtime/automations-protocol.ts (type), runtime/cloud-protocol.ts (type), runtime/connection-ui.tsx (assert, error class, type), runtime/development-cloud-agents.ts (type), runtime/local-agent.ts (type). Text/path pins: `test/fixtures/scheduled-task-controls.mjs`, `specs/quint/application/manifest.json` sources, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-11 | C5 | Same body as app-record-route-policy.ts:13-15 with group `'automations'`. | `assertOwnerRequest('automations', path, method, body, m => new AutomationRequestNotDispatchedError(m))` in owner-route-policy.ts. | Low. |
| 2 | 3 | C1 | `AutomationsMethod` twin of `AppRecordMethod`. | One `OwnerRouteMethod`. | None. |
| 3 | 6-8 | keep | `AutomationRequestNotDispatchedError` is meaningful (connection-ui.tsx:2466-2468 uses it to report "nothing was sent"). | Move with the assert. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AutomationsMethod` | type | 3 | `AppRecordMethod` | owner-route-policy.ts |
| `AutomationRequestNotDispatchedError` | class | 6-8 | `notDispatched:true` flag pattern in alpha-client.ts:362 | owner-route-policy.ts |

## Proposed end state
File removed; ~6 lines added to owner-route-policy.ts.

## Verification
`test/fixtures/scheduled-task-controls.mjs` users, automations Playwright specs, `npm run verify` typecheck for the five type importers.
