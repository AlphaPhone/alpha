# apps/app/src/runtime/managed-service-routes.ts
- Lines: 29 | Role: allow-list of Eliza Cloud managed-service routes (account, billing, Google, Gmail, Calendar sync, Maps) that the renderer's native HTTP port and the dev browser resident may call, plus Maps tile-path and idempotency-header checks. | Verdict: SIMPLIFY
- Importers: 3 (`runtime/native-connection.ts:4` — product gate at 174/177/181; `runtime/cloud-protocol.ts:12` `mapsTilePath`; `runtime/browser-cloud-resident.ts:2` dev). Text/path pins: `scripts/browser-cloud-dev-bridge.ts:1`, `scripts/test-google-calendar-protocol.ts:9`, `specs/quint/services/manifest.json:96,151,155,2351`, `test/managed-service-routes.test.mjs:5`, `test/native-connection-headers.test.mjs:6`, `test/support/feature-parity.mjs:552`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-29 | D9 / D8 | `managedServiceRequest` is a chain of 10 `if` returns mixing method, query and body rules, ending in a 400-char `['/api/v1/user',…].includes(path)||/…/.test(path)||/…/.test(path)` line. | Route table: `const ROUTES: Array<{method; path: string|RegExp; query: 'none'|'required'; body: boolean}>` and one `find`. Keeps every rule explicit and reviewable. | Low; the table must reproduce each rule exactly (Quint `services/manifest.json` pins). |
| 2 | 19-20 | A2 / owner | `/api/v1/eliza/google/calendar/sync-v1/{capabilities,event}` admissions: no renderer caller (grep apps/app/src: only this file). Callers are the dev browser resident (`scripts/browser-cloud-dev-bridge.ts:462`, via `browser-cloud-resident.ts`) and the native Java policy `CalendarSyncConsent.java:12` (separate). The client-side linked-sync stack is being deleted (DECISIONS D4). | After D4, check whether the agent's managed calendar host still reaches sync-v1 through the browser resident; if not, delete lines 19-20 and the matching `test/managed-service-routes.test.mjs:23` case. | Medium: needs the dev-cloud path owner to confirm. |
| 3 | — | C7 | Parallel route policies: upstream `packages/app/src/runtime/managed-google-agent/managed-google-route-policy.ts` (`managedGoogleRequest`), Java `CalendarSyncConsent.java` / `ConnectionRoutes`, and this file. | Record in `cross-file-actions.md` as an upstream follow-up (one shared route table exported upstream, D14); no local change. | — |
| 4 | 22 | A8 | "(#412)" issue citation. | Drop the number, keep the sentence. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `MAPS_POST` | const | 4 | upstream maps client paths | stays |
| `mapsTilePath` | helper | 5-9 | `scripts/browser-cloud-dev-bridge.ts:402` reuses it | stays |
| route allow-list | const (inline) | 26-28 | upstream `managed-google-route-policy.ts`, Java `ConnectionRoutes`/`CalendarSyncConsent` | table here (upstream follow-up) |

## Proposed end state
~35 lines as a declarative route table plus the two Maps helpers (longer than today's dense lines but reviewable); sync-v1 rows removed if the dev resident no longer needs them.

## Verification
Quint services manifest entries (96, 151, 155, 2351), `test/native-connection-headers.test.mjs`, `scripts/test-google-calendar-protocol.ts`, Maps/Gmail/account Playwright journeys, Android native-connection on device.
