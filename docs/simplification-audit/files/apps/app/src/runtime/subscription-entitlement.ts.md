# apps/app/src/runtime/subscription-entitlement.ts
- Lines: 143 | Role: Alpha binding of the upstream Cloud subscription entitlement client (copy names, plan refusal text, Cloud-unreachable / identity-refused predicates, resident admission outcome). | Verdict: SIMPLIFY
- Importers: `maps/cloud-maps.ts:5`, `prototype/settings-adapter.ts:32`, `runtime/cloud-membership-ui.tsx:10`, `cloud-protocol.ts:14`, `cloud-voice.ts:11`, `connection-ui.tsx:70`, `diagnostics-export.ts:3`; scripts `test-cloud-maps.ts`, `test-cloud-subscription.ts`, `test-connection-history.ts`. Also aliased in `tsconfig.json` and `vite.config.ts`.
- Text/path pins: Quint `services/authorization.mjs:3,15`, `maps-connection.mjs:34` (replaces `'../runtime/subscription-entitlement.ts'`), `plan-admission-ports.mjs:14`, `specs/quint/services/manifest.json`; `test/subscription-entitlement.test.mjs` (reads text) and 10 other tests; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43-45 | A7 | `allowanceText` wrapper: 0 callers anywhere (src and tests). | Delete with the `sharedAllowanceText`/`PlanAllowance` imports. | None |
| 2 | 69 | B4 | `void copy;` no-op inside the billing-refused branch. | Delete; move `const copy` below the early returns. | None |
| 3 | 35-40 | — | `view.kind==='credits'` special case ("No plan" / "Choose plan"). | Owner: is a credits view still reachable? If not, delete. | Owner |
| 4 | 47-55 | B1 | `clock()` catches and falls back to `toISOString()` (which throws on the same invalid date). | Drop the try/catch; callers pass finite times. | Low |
| 5 | 28 | D4 | `export *` of upstream plus local overrides with the same names (`describeSubscription`, `serviceLimitMessage`, …) — shadowing makes it unclear which version a caller gets. | Keep the binding module, but re-export explicitly the upstream names callers need. | Low |
| 6 | 109 | A7 | `ResidentAdmissionOutcome` exported, 0 external users. | Unexport. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `alphaSubscriptionCopy` | helper | 31 | product names in `product/alpha-product-registration.ts` | read names from registration |
| `clock` | helper | 47 | `prototype/locale-time.ts` | inline `formatMonthDay`+`formatTime` |
| `CloudIdentityUnreachable` | class | 80 | — | keep |

## Proposed end state
~120 lines: no `allowanceText`, no `void copy`, plain `clock`, explicit re-exports; credits branch per owner.

## Verification
`test/subscription-entitlement.test.mjs`, `test/redeemed-plan-end.test.mjs`, `test/resident-admission-outcome.test.mjs`, `test/cloud-reachability.test.mjs`, Quint authorization/plan-admission/maps-connection refinements, `scripts/test-cloud-subscription.ts`, `scripts/test-cloud-maps.ts`.
