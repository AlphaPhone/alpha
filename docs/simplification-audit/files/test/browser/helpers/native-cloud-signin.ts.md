# test/browser/helpers/native-cloud-signin.ts
- Lines: 127 | Kind: Playwright fixture that starts a **second Vite dev server** with a synthetic composition entry (hidden harness, P16) | Verdict: **REWRITE** into `harness/cloud.ts`; drop the private Vite server
- Covers: in-app Eliza Cloud sign-in (email/phone/Google/MFA, offline, hold/cancel, readiness) on the `ConnectionChooser` + `StartupPermissions` composition with mocks disabled, plus the entitlement signer. Duplicates: signer/`entitlements`/`USER` copied verbatim in `native-cloud-plan-fixture.ts`; sign-in journeys also in `post-sign-in-setup*.spec.ts`, `accessibility-sign-in.production.spec.ts`. Callers/importers: `native-cloud-signin.spec.ts`, `specs/quint/legacy/sign-in/check-sign-in-refinement.mjs` (import + source pin).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-29 | P16, T9 | `createServer()` boots its own Vite server with a virtual `/subscription-entry.tsx` that renders only two components and fakes `Capacitor.getPlatform()`. This is a third build of the product (neither the dev app nor the shipped bundle). Cost: a cold Vite transform per worker and 90 s timeouts (:124,126). | Run the same journeys on the `production` project with `flagOffAndroid` + an `AlphaCloudSignIn` plugin fake; the real bundle already has mocks off. | Medium: the composition isolates chooser + permissions from Home; the production app will also render Home, so assertions need scoping to the dialog. |
| 2 | 12-26 | B1/D5 | Temporarily rewrites `process.env.ELIZA_DEV_ALLOW_TEST_MOCKS` in the Playwright worker process. | Disappears with finding 1. | none |
| 3 | 32-51 | C3 | Duplicate signer (see `native-cloud-plan-fixture.ts`). | Shared `harness/cloud-entitlements.ts`. | none |
| 4 | 118-123 | D7 | Wraps the serialised initializer to define tsx's `__name` helper in the page. | Pass a plain function to `addInitScript` from a `.js` harness module or keep this idiom in one place (`harness/bridge.ts`). | none |
| 5 | 6 | A8 | "owner directive 2026-10-14". | Delete. | none |

## Proposed end state
`harness/cloud.ts` provides the `AlphaCloudSignIn` fake (modes `ok|created|mfa|hold|offline|readiness-hold|not-ready`) as a
bridge plugin; `journeys/connection-cloud.spec.ts` drives sign-in on the production bundle. No spec starts its own Vite server.
The legacy Quint sign-in harness is retired (P6) or ported to the production lane first.
