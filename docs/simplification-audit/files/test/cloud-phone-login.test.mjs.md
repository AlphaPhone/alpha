# test/cloud-phone-login.test.mjs
- Lines: 59 | Kind: mixed: component render (esbuild bundle of real `cloud-sign-in-ui.tsx` + `renderToStaticMarkup`, regex on HTML), integration-ish (real `CloudProtocol` loaded with Vite SSR, stub native sign-in port), unit (pure `signInReadiness`) | Verdict: MERGE into `test/integration/connection-cloud.test.mjs` (cases 2-3); REWRITE case 1 in `journeys/connection-cloud.spec.ts`
- Covers: phone sign-in field only appears with native support; phone codes go through the native host, keep MFA, never use renderer HTTP; readiness discovery never guesses SMS from malformed answers. Duplicates: `test/cloud-sign-in-state.test.mjs` (same panel, phone prefill case 352-361), `test/browser/native-cloud-signin.spec.ts` and `accessibility-sign-in.production.spec.ts` (render the same panel in a browser). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-32 | T6-like / T1-like | Bundles the panel and regex-matches static markup for labels, `type="tel"`, copy absence. This is UI copy checked as HTML text; `native-cloud-signin.spec.ts` already drives the real panel. | Move the three meaningful assertions (no phone field without native support; "Email or phone" single field; failed SMS attempt returns with its number) into `journeys/connection-cloud.spec.ts`. Drop the negative-copy regexes (21-22, 31). | Low |
| 2 | 34-50 | - | Real `CloudProtocol` with a stub native `signIn` port: phone start/verify reach native, MFA status kept, renderer fetch never runs, missing `startPhone` -> `unavailable`. Real trust-boundary behaviour. Cost: starts a Vite SSR server (~1-2 s). | Keep, move to `test/integration/connection-cloud.test.mjs` and share one Vite SSR server across that file. | Low |
| 3 | 52-59 | T3 (acceptable) | `signInReadiness` table: native readiness parsed at the bridge boundary. | Fold the six rows into the same integration file next to case 2. | None |
| 4 | 2-12 | C3 | Imports both esbuild and Vite for one file; mixed loader strategies. | One loader (Vite SSR) once merged. | None |

## Proposed end state
Gone as a file. `test/integration/connection-cloud.test.mjs` gets one "phone sign-in stays native" case (lines 34-50) and the readiness table. The rendered phone/email field behaviour is one step in `journeys/connection-cloud.spec.ts` (sign-in chooser with the native sign-in fake, phone enabled and disabled).
