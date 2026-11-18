# test/upstream-owner-gate-compat.test.mjs
- Lines: 258 | Kind: mixed: text hash of an upstream function (test 1), regex-parsed model of upstream `isOwnerOnlyApiRequest` + regex scan of all `/api/...` literals in `apps/app/src` and `android/.../java` (tests 2-3), real unit of `ownerRouteAllowed`/`calendarApprovalResolvePath` (test 4), source regexes on Java and upstream (tests 5-6) | Verdict: REWRITE as an upstream-pin case in `test/tooling/upstream-pin.test.mjs`
- Covers: no route Alpha calls falls under the pinned agent's owner-only gate except the reviewed Calendar approval POST; native enrollment pairs as owner; only trigger/automation routes depend on upstream's separate owner checks. Duplicates: none. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-33, 170-174 | T10, B5 | SHA-256 of a text slice of `vendor/eliza/packages/agent/src/api/server.ts` (`isOwnerOnlyApiRequest`, l.1085, not exported); every upstream reformat forces a hash update. | Upstream follow-up (D14): export `isOwnerOnlyApiRequest`. Then import it and drop the hash. | low |
| 2 | 36-58, 176-196 | T10 | Rebuilds the gate from regexes over its source (`under("…")`, `pathname.startsWith`, `(write &&`). Misses any clause written differently. | Replace with calls to the real exported function. | medium |
| 3 | 60-132, 142-159 | T1 | Walks all renderer/Java sources for path literals, asserts exact regexes and use counts in `calendar-approval*.ts`, `local-agent.ts`, `connection-ui.tsx`. | Delete. Use `OWNER_ROUTE_TABLE` (the product's own admission table, enforced by `owner-route-policy.ts` in `local-agent.ts`/`native-connection.ts`) as the list of routes Alpha may call. | medium |
| 4 | 223-234 | — | Real behaviour: only an exact UUID POST to `/api/approvals/{id}/resolve` is admitted; other methods/suffixes/ids refused. | Keep these cases. | none |
| 5 | 236-258 | T1 | Regexes on `AlphaLocalAgentPlugin.java` and upstream pairing comments and server routes. | Delete; enrollment-as-owner is device/integration evidence (resident journey). | low |
| 6 | 20-24, 178-179 | A8 | Comments list upstream PR numbers. | Goes with the rewrite. | none |

## Proposed end state
In `test/tooling/upstream-pin.test.mjs`: for every method/path in `OWNER_ROUTE_TABLE`, call the pinned upstream
`isOwnerOnlyApiRequest` (imported) and assert only `POST /api/approvals/{uuid}/resolve` is owner-only; plus the
`ownerRouteAllowed`/`calendarApprovalResolvePath` refusal cases. Needs: upstream export of `isOwnerOnlyApiRequest`
(upstream follow-up), and the owner confirming every agent request passes `OWNER_ROUTE_TABLE` (otherwise the table is not
the complete route list). Until the export lands, keep tests 1-4 only and delete 5-6.
