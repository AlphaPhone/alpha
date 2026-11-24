# test/cloud-environment-selection.test.mjs
- Lines: 46 | Kind: unit (real `runtime/cloud-environment-selection.ts`) + transplant (regex-extracts `env` expression and `cloudLogin` body from `connection-ui.tsx`, `vm`-runs them) + source-text (6 `assert.match` on `connection-ui.tsx`, 1 negative regex on the resolver source) | Verdict: DELETE; carry 2 cases to `journeys/connection-cloud.spec.ts` / `journeys/production-gating.spec.ts`
- Covers: staging is the default only for development + test-mocks + non-Android with the exact preview flag; explicit saved environment wins; production builds never select staging; sign-in dispatches the selected issuer; the resolver has no side effects. Duplicates: `test/browser/dev-cloud-setup.spec.ts`, `browser-cloud-dev.spec.ts` (staging selector in dev), production bundle audit (no staging authority in production). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-33 | T2/T1 | Regex extraction of an arrow body and a method body plus six statement pins. | Delete. | None |
| 2 | 35-38 | T1 | Negative regex over the resolver for `localStorage|credential|token|fetch(`. Style rule. | Delete. | None |
| 3 | 8-16, 40-46 | T3 | The real rule is "a production build never talks to staging". | Production audit already forbids staging authorities in the bundle (confirm `audit-production-bundle.ts` checks the staging host); dev journey: selector set to Staging -> sign-in request goes to the staging origin. | Low |

## Proposed end state
Deleted. Production exclusion is enforced by the production bundle audit; dev staging selection is one dev-project
journey step.
