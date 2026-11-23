# apps/app/src/runtime/owner-route-policy.ts
- Lines: 50 | Role: renderer interpreter of the owner-route table (`product/owner-route-table.ts`), shared in meaning with Android `OwnerRoutePolicy`. | Verdict: KEEP (minor)
- Importers: `runtime/native-connection.ts:5`, `local-agent.ts:10`, `development-cloud-agents.ts:4`, `app-record-route-policy.ts:4`, `automations-route-policy.ts:2`, `scripts/local-agent-dev-bridge.ts:3`.
- Text/path pins: `test/owner-route-parity.test.mjs`, `test/owner-route-native-import.test.mjs`, `test/upstream-owner-gate-compat.test.mjs`, `test/local-agent-feature-starting.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | B3 | validates the compile-time table at module load (`throw Error('Owner route group … has an {id} route but no id pattern')`). | Move the check to `test/owner-route-parity.test.mjs` (or type the table so `{id}` requires `id`); compile only. | Low |
| 2 | 6 | C1 | inline cast type of a group. | Type the table in `owner-route-table.ts` and drop the cast. | Low |
| 3 | 48-50 | B1 | `try{return decodeURIComponent(value)}catch{return undefined}` — specified (malformed refuses). | Keep. | None |
| 4 | 3 | A7 | `OwnerRouteGroup` exported, 0 external users. | Unexport. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `segment`, `decode` | helper | 37-50 | Java `OwnerRoutePolicy` (same semantics by design) | keep |

## Proposed end state
~45 lines; table typed at source; load-time check moved to the parity test.

## Verification
`test/owner-route-parity.test.mjs`, `test/owner-route-native-import.test.mjs`, `test/upstream-owner-gate-compat.test.mjs`, managed-service route tests.
