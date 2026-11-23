# apps/app/src/runtime/cloud-membership-ui.tsx
- Lines: 74 (9 lines >200 chars, longest 907) | Role: `CloudMembershipControls` — Account sheet body: balance, plan, usage bar, limit, plan/add-funds/code actions and membership-code redemption; plus `FUNDING_NEEDED` copy and `fundingRefusedReply`. | Verdict: SIMPLIFY
- Importers: `connection-ui.tsx:79` only (render at 3905; `FUNDING_NEEDED` at 348; `fundingRefusedReply` at 1783).
  Text/path pins: `specs/quint/application/manifest.json:4013`, `test/subscription-entitlement.test.mjs:70,154,161` (reads this file's text and asserts its exact `subscription-entitlement` import list `['alphaSubscriptionCopy','type ServiceLimit','type SubscriptionView']` and that the import keyword is non-`type` — T1), `test/subscription-entitlement.test.mjs:126` (regex on connection-ui call `fundingRefusedReply(cloudServiceName(cloud.environment))`), `test/cloud-membership-ui.test.mjs`, `test/cloud-membership-presentation.test.mjs` (esbuild bundle + render, T3), `test/support/login-surfaces.mjs:100`, `test/browser/resident-failures.production.spec.ts:45` (comment), `test/support/feature-parity.mjs:483`; tests `connection-presentation-state.test.mjs:116`, `connection-recovery-state.test.mjs:39`, `pending-action-failure-boundary.test.mjs:40` stub `FUNDING_NEEDED`/`fundingRefusedReply` by name.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | NEW (dead parameter) / A8 | `export function fundingRefusedReply(serviceName:string):string {void serviceName;return 'Billing declined';}` — the parameter is discarded with `void` to keep an old signature. | Replace with `export const BILLING_DECLINED = 'Billing declined'` and use it at `connection-ui.tsx:1783` and in line 66 (`<StatusDot tone="err">Billing declined</StatusDot>` repeats the same literal). | Low; update the regex in `test/subscription-entitlement.test.mjs:126` (or delete that T1 assertion) and the 2 stubs. |
| 2 | 7 | C6 | `FUNDING_NEEDED='Plan needed'` — copy constant lives in the UI file but is only used by the controller (`connection-ui.tsx:348`). | Keep, but co-locate copy constants (`FUNDING_NEEDED`, `BILLING_DECLINED`) in `subscription-entitlement.ts` beside `alphaSubscriptionCopy`. | Low (T1 import-list test). |
| 3 | 10-11 | D8 | `import` statements after code (lines 10-11 follow `export` declarations). | Move to top. | None. |
| 4 | 28 | D8 | 683-char props signature. | Declare `type CloudMembershipProps` above. | None. |
| 5 | 55-72 | D8 / D9 | Lines 57 (420 chars), 66 (nested ternary chain `refused?…:checking?'':noPlan?'':!active?'Couldn’t refresh':plan.status==='past_due'?…`), 67 (907 chars, two action groups), 72. | Extract `supportLine(plan, refused, checking, noPlan)` and a `PlanActions` subcomponent; formatter. | Low; copy unchanged. |
| 6 | 67 | NEW (duplicate action) | "Plan" and "Add funds" buttons both call `onManagePlan` (same Cloud billing page). | Product decision: keep both entry points or one. Note only. | Owner question. |
| 7 | 51 | B1 | `catch{setSubmissionError('Not confirmed');}` — specified copy for an unknown redemption outcome. | KEEP, add comment. | — |
| 8 | 57 | C3 | Inline USD formatting `Number(credits.usd).toLocaleString(undefined,{minimumFractionDigits:2,…})`; twin `cloud-personal-setup.tsx:5 money`. | Leave (twin is being deleted). | — |
| 9 | 12-16 | — | `endLabel` small helper. | KEEP. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `MembershipBalance` | type | 5 | `connection-ui.tsx` snapshot field `membershipBalance` union | keep here (or `subscription-entitlement.ts`) |
| `FUNDING_NEEDED` | const | 7 | — | `subscription-entitlement.ts` copy |
| `fundingRefusedReply` | helper | 9 | literal `'Billing declined'` on line 66 | `BILLING_DECLINED` const |
| `endLabel` | helper | 12-16 | — | keep |

## Proposed end state
~75 formatted lines (props type extracted, two small helpers/subcomponent), copy constants moved next to `alphaSubscriptionCopy`, the dead-parameter function replaced by a constant. Net code change small; readability gain large.

## Verification
`test/cloud-membership-ui.test.mjs`, `test/cloud-membership-presentation.test.mjs`, `test/subscription-entitlement.test.mjs` (update import-list/regex assertions), `specs/quint/application` account-sheet harness, Playwright `cloud-account-panel`, `billing-recovery.production.spec.ts`, `resident-failures.production.spec.ts`.
