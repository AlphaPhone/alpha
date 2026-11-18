# apps/app/src/runtime/app-record-route-policy.ts
- Lines: 15 | Role: `AppRecordPort` interface plus `assertAppRecordRequestAllowed` (owner route table check for Notes/Calendar records) | Verdict: MERGE — the assert into `owner-route-policy.ts`; the port type stays and gains the shared fetch adapter (rename file `app-record-port.ts`)
- Importers: prototype/agent-calendar-adapter.ts, prototype/canonical-notes-controller.ts, prototype/canonical-notes-ui.ts, runtime/agent-calendar-client.ts, runtime/connection-ui.tsx (assert + `AppRecordMethod`), runtime/local-agent.ts (`AppRecordMethod`). Text/path pins: `scripts/test-agent-calendar-mutation-flow.ts`, `test/google-calendar-connect.test.mjs`, `test/google-calendar-link-status.test.mjs`, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-15 | C5 | `assertAppRecordRequestAllowed` is the same function as `automations-route-policy.ts:9-11` with a different group name and error class: `if(!ownerRouteAllowed(group,path,method)||((method==='GET'||method==='DELETE')&&body!==undefined))throw …`. | `assertOwnerRequest(group, path, method, body, makeError)` in owner-route-policy.ts; delete both wrappers. | Low. |
| 2 | 5 | C1 | `AppRecordMethod` twin of `AutomationsMethod` (automations-route-policy.ts:3). | One `OwnerRouteMethod` type exported by owner-route-policy.ts (derive from the route table). | None. |
| 3 | — | C5 | Shared fetch adapter for this port is duplicated in agent-calendar-client.ts:9-16 and canonical-notes-controller.ts:15-22. | Add `appRecordFetch` here (see agent-calendar-client report). | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AppRecordMethod` | type | 5 | automations-route-policy.ts:3 `AutomationsMethod` | owner-route-policy.ts |
| `AppRecordPort` | interface | 6-12 | none | `app-record-port.ts` |
| `assertAppRecordRequestAllowed` | helper | 13-15 | `assertAutomationRequestAllowed` | owner-route-policy.ts `assertOwnerRequest` |

## Proposed end state
`app-record-port.ts` (~22 lines): `AppRecordPort` and `appRecordFetch`. Route assertion lives in owner-route-policy.ts.

## Verification
`test/google-calendar-connect.test.mjs`, `test/google-calendar-link-status.test.mjs`, `scripts/test-agent-calendar-mutation-flow.ts`, canonical notes Playwright specs, connection-ui app-record request path.
