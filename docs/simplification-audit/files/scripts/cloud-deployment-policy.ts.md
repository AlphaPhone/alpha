# scripts/cloud-deployment-policy.ts
- Lines: 29 | Kind: script (configuration constant: Cloud origins, tenants, sign-in paths) | Verdict: KEEP (absorb `cloud-sdk-authority.ts`)
- Covers: the single source of Alpha's production/staging Cloud authorities and sign-in registration, from which `cloud-deployment.ts` generates `CloudDeployment.java`, `cloud-deployment.generated.ts` and `.gradle`. Callers: `scripts/cloud-deployment.ts`, `cloud-readiness.ts`, `cloud-sdk-authority.ts`, `verify-apks.ts`, `render-assetlinks.ts`, `android/app/product.gradle`; listed in `quint-lib.ts`, `source-snapshot.ts`, `specs/quint/services/manifest.json`; tests `cloud-deployment`, `cloud-readiness`, `cloud-email-deployment`, `cloud-sdk-routing`, `ci-affected`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D4 | `cloud-sdk-authority.ts` (14 lines) derives `api + '/api/v1'` from this file's constant and re-validates it. | Move `cloudEnvironments`, `CloudEnvironment` and `CLOUD_SDK_BASES` here; delete `cloud-sdk-authority.ts`. | Low |
| 2 | 18,26 | C6 | `name: 'Eliza Cloud'` and `entitlementAudience` repeated per environment. | Acceptable as data; leave. | — |

## Proposed end state
One policy module exporting `CLOUD_DEPLOYMENT`, `CLOUD_SIGN_IN_REGISTRATION`, `cloudEnvironments`, `CloudEnvironment` and `CLOUD_SDK_BASES` (computed, no validator).
