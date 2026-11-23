# test/subscription-entitlement.test.mjs
- Lines: 231 | Kind: mixed: real-module calls (`apps/app/src/runtime/subscription-entitlement.ts`, an `export *` of upstream) + transplants (esbuild-transforms `cloud-membership-ui.tsx`, `status-ui.tsx` and the upstream hook with imports stripped; slices `residentPlanSettings()` from `connection-ui.tsx`) + heavy source-text and an importer inventory | Verdict: DELETE (carry 3 cases to `journeys/connection-cloud.spec.ts`)
- Covers: Alpha's Cloud plan copy (rate limit, billing declined, plan needed), the account sheet's plan/allowance/limit lines and Settings plan states (unavailable, expired, inactive, credits). Duplicates: `test/browser/native-cloud-subscription.spec.ts`, `settings-truth.production.spec.ts:271-292` (Settings > Eliza Cloud plan and redemption states), upstream `packages/cloud/sdk/src/subscription-entitlement.test.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 46-52 | T1 | Regexes that the binding file is a single `export *` and that `prepare-client-features.ts` lists the path. | Delete. | Low |
| 2 | 54-62 | T5 | `organizationCreditFromLimits` is upstream code. | Delete. | Low |
| 3 | 64-117 | T2 | Transforms three TSX files with imports stripped and rebuilds components via `new Function`; ends with regexes of exact JSX/hook text. | Delete; carry "active plan shows allowance % and current limit; lapsed limit hidden" to the journey. | Med |
| 4 | 119-172 | T1/A7 | Regexes `connection-ui.tsx` statements, counts `checkEntitlement(` calls, and pins an exact list of 8 importer files: every refactor edits it. | Delete. | Low |
| 5 | 175-229 | T2 | Evaluates `residentPlanSettings()` sliced from an object literal. | Carry "plan status unavailable" and "No plan with credits" as journey rows. | Med |
| 6 | 20-44 | T3 | Copy binding of Alpha product name into shared messages. | Carry the 429 message case to the journey (chat turn refused with 429 shows the Alpha copy). | Low |

## Proposed end state
File deleted. `journeys/connection-cloud.spec.ts` gets three cases on the Cloud fake: a 429 turn shows "Alpha Phone did not retry
your message"; an active plan shows allowance and limit in the account sheet; Settings plan row shows "Plan status unavailable" on an
entitlement outage. Pure presentation stays upstream-tested.
