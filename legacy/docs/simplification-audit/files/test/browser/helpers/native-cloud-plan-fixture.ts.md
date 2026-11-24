# test/browser/helpers/native-cloud-plan-fixture.ts
- Lines: 103 | Kind: Playwright fixture (Cloud plan/billing/entitlement bridge fake + Node-side ES256 token signer) | Verdict: **MERGE** into `harness/cloud.ts` (with `native-cloud-signin.ts`)
- Covers: signed entitlement tokens for every plan status; `AlphaConnection.request` answers for `/api/v1/{user,credits/balance,subscription/*,billing/limits}` with failure modes (401/503/offline/rate/already/transport-once); saved credential slot `cloud:production`; resident agent provider binding with a held `configureCloudProvider`. Duplicates: `signer`/`entitlements`/`USER`/`b64` are verbatim copies of `native-cloud-signin.ts:32-51` (C3). Callers/importers: `native-cloud-subscription.spec.ts` and the live Quint harnesses `specs/quint/refinement/application/account-sheet.mjs` and `cloud-connection-notices.mjs` (import and source pin).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-25 | C3, T4 | Token signer and `entitlements()` duplicated verbatim in `native-cloud-signin.ts`. | One `harness/cloud-entitlements.ts`. | none |
| 2 | 44-101 | P6 | Inline bridge (`w.Capacitor={PluginHeaders…}`). | Plugins on `harness/bridge.ts`. | Low. |
| 3 | 39 | D10 | `sessionStorage['plan-fixture-seeded']` guard so storage seeds once per tab across reloads. | Harness `seed` runs once per context. | none |
| 4 | 59 | A8 | "(P-43)" reference comment. | Keep only if P-43 is a PRD id (it is a PRD id style); fine. | none |

## Proposed end state
`harness/cloud.ts` exports `cloud({plan, route, limits, identity, redeem, credits, saved})` and `entitlements()`; this
file is deleted and both live Quint harnesses import from the new path in the same commit (their source-pin lists updated).
