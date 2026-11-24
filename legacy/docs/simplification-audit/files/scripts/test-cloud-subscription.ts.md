# scripts/test-cloud-subscription.ts
- Lines: 158 | Kind: integration of `CloudProtocol` subscription routes over a fake native transport | Verdict: MERGE into `test/cloud-protocol.test.ts` as a `subscription` describe block
- Covers: subscription code redemption (normalisation, one replay with the same idempotency key on transport loss, generic code-free refusals, 429 retry time from body, 401 stays a sign-in failure, malformed success refused), the billing-snapshot fallback when the entitlement route is absent, and the exact plan-management URL per environment. Duplicates: `test/subscription-entitlement.test.mjs`, `test/redeemed-plan-end.test.mjs`, `test/browser/native-cloud-subscription.spec.ts`, `test/cloud-membership-ui.test.mjs`. Callers/importers: `test/adapter-contracts.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | T9 | Self-respawn through `child-command.ts` when the tsx loader is absent. | Delete. | L |
| 2 | 135 | A8 | `Reflect.get(cloud,'creditBalance')` "is retired" assertion: a tombstone check. | Delete. | L |
| 3 | 87-100 | — | Refusal table is the useful part; keep. | Keep. | L |
| 4 | 124-136 | T4 | Billing fallback also covered in `subscription-entitlement.test.mjs`; check overlap when merging and keep one. | Keep the one that runs through `CloudProtocol`. | L |

## Proposed end state
Six `test()` cases inside `test/cloud-protocol.test.ts`; file deleted; `scripts/child-command.ts` loses one importer.
