# test/managed-service-routes.test.mjs
- Lines: 84 | Kind: unit of a security allowlist (real import of `runtime/managed-service-routes.ts`) + one transplant (33-49 slices `native-connection.ts`) | Verdict: MERGE route tables into `test/integration/connection-cloud.test.mjs`; DELETE 33-49
- Covers: the renderer may call only the exact reviewed Cloud service routes/methods/bodies (user, billing, entitlement, redeem, Google, Calendar sync, Maps, tiles) and nothing agent- or pairing-shaped. Duplicates: `native-connection-headers.test.mjs` (Maps identity header, transplant of the same file). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-49 | T2 | Slices `createBrowserConnection` and `nativeCloudRequest` out of `native-connection.ts` by `indexOf`, strips types, runs in `vm` with ~15 fake globals, to show flag-off transports refuse dev hosts. | Delete. Production refusal belongs to the production-gating lane (`journeys/production-gating.spec.ts` / `audit-production-bundle.ts`). | Medium |
| 2 | 6-31, 52-84 | T3 (kept exception) | Route admission is a security boundary with many negative rows; integration through a journey cannot enumerate them. | Fold into one table-driven case set (allowed rows / refused rows) in the connection-cloud integration file. | Low |
| 3 | 17-22 | A8 / A3 | Rows for retired routes (`credits/balance`, `auth/cli-session`) carry history comments. | Keep as plain refused rows; drop the narration. | None |

## Proposed end state
File deleted. `test/integration/connection-cloud.test.mjs` holds two data tables (admitted, refused) and one Maps
request-identity case, all against the real `managed-service-routes.ts` exports.
