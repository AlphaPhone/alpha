# specs/quint/refinement/services/authorization.mjs
- Lines: 71 | Kind: Quint refinement harness (imports real `checkEntitlement`, `EntitlementRefresher`, `planAdmission` from `apps/app/src/runtime/subscription-entitlement.ts`; real WebCrypto ES256 signing) | Verdict: KEEP
- Covers: model `ServiceAuthorization`: signed entitlement active/past-due/canceled views, fallback plan snapshot and organisation credits, signed "none" with fallback, outage withdraws fallback admission but not an unexpired signed one, signed expiry at the lifetime boundary (8 traces). Duplicates: `test/browser-cloud-dev-bridge.test.mjs` uses `subscription-entitlement` in bridge flows but does not walk refresher timing; no other formal link. Importers: `index.mjs` only (no per-model wrapper; runs through the services aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | B5 | `sources` names the harness itself and `support.mjs` for receipt hashing. | Keep only the product file once receipt hashing shrinks (see `check-traces.mjs`). | None |
| 2 | — | P4 risk | Its only runner is `test/quint-services-refinement.test.mjs` (verdict DELETE, T4). | The single manifest-driven runner (`test/quint-refinement.test.mjs`) must include every manifest model, including those with no per-model wrapper. | Medium if missed: model loses its only run |
| 3 | 42-43 | D8 | Two ~250-character lines. | Reformat. | None |

## Proposed end state
Unchanged behaviour; this is the pattern the PORT harnesses should follow (import the module, inject ports).
