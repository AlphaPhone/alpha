# scripts/cloud-sdk-authority.ts
- Lines: 14 | Kind: script (derived constant) | Verdict: MERGE into `scripts/cloud-deployment-policy.ts`
- Covers: `cloudEnvironments`, `CloudEnvironment` and `CLOUD_SDK_BASES` (`api + '/api/v1'`), the resident's `ELIZAOS_CLOUD_BASE_URL`. Callers: `cloud-deployment.ts`, `cloud-resident-host.ts`, `start-cloud-qa.ts`; tests `cloud-deployment`, `cloud-sdk-routing`, `product-character-host`, `fixtures/product-character-host.mjs`; Quint `services/manifest.json`, `refinement/application/boundaries.mjs`, `refinement/services/cloud-qa-launcher{,-probe}.mjs` (text pins).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | B3 | Re-validates HTTPS canonical origin already checked by `validateCloudDeployment`. | Drop; compute bases. | Low |
| 2 | 8 | B2 | `config?.[environment]?.api` on a typed record. | Plain access. | Low |
| 3 | whole | D4 | 14-line module whose only input is the policy constant. | Merge; update importers and the four Quint text pins in the same change. | Med (Quint pins) |

## Proposed end state
Gone; three exports live in `cloud-deployment-policy.ts`.
