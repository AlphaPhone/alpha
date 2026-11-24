# specs/quint/services/ServiceAuthorization.qnt
- Lines: 137 | Kind: Quint model (services family, live; 9 tests, 4 witnesses, 2 symbol pins) | Verdict: KEEP
- Covers: `runtime/subscription-entitlement.ts` `EntitlementRefresher` + `managed-service-routes.ts`: signed entitlement expiry, unsigned billing snapshot without lifetime, signed no-plan supplemented only by organization credits, refresh outage keeps only an unexpired signed plan, and exact managed-route admission (a route outside the table or refused by Cloud is never dispatched; owner change retires dispatch). Sources exist (`subscription-entitlement.ts`, `managed-service-routes.ts`, `cloud-environment-selection.ts`, upstream `managed-google-route-policy.ts`). Duplicates: `PlanAdmissionGrace.qnt` (stored record + resident admission, different state); `test/subscription-entitlement*.test.mjs` host suites (other chunks). Callers/importers: manifest; harness `refinement/services/authorization.mjs` (imports `checkEntitlement`, `EntitlementRefresher`, `planAdmission` etc. directly; real WebCrypto; no slicing); services aggregate only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 91, 109, 117 | naming | Refused-route examples are `"hosted-agent"` and `"cli-session"`. Hosted pairing is deleted (D5); as an example of a route outside the table it is still valid. | Optional rename to `"unlisted"`; witness `RefusedRouteWitness` follows. | None |
| 2 | manifest | — | Harness refines only the entitlement half; the route half is checked by the model's tests against `managedServiceRequest` symbol pins, not by a trace replay. | Optional: add `managedServiceRequest` route cases to `authorization.mjs` (it can import the module). | Low |

## Proposed end state
Unchanged; already an import-based refinement.
