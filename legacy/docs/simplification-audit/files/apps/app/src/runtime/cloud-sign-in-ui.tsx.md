# apps/app/src/runtime/cloud-sign-in-ui.tsx
- Lines: 136 (12 lines >200 chars, longest 555) | Role: `CloudSignInPanel` — Alpha's own sign-in screens (Google, email/phone code with six-box input, MFA, resend countdown, own-keys entry). | Verdict: SIMPLIFY (light)
- Importers: `connection-ui.tsx:74` (one render at 3886).
  Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/legacy/manifest.json`, `specs/quint/legacy/sign-in/check-sign-in-refinement.mjs`, `specs/quint/services/manifest.json`, `specs/quint/application/README.md`, `test/chooser-direct-entry.test.mjs`, `test/cloud-phone-login.test.mjs`, `test/cloud-sign-in-state.test.mjs` (imports `SIGN_IN_BROWSER`), `test/support/login-surfaces.mjs`, `test/support/feature-parity.mjs:489`. Visible copy/aria labels are asserted by many production Playwright specs (`accessibility-sign-in.production`, `signed-out-page.production`, `native-cloud-signin`) — preserve exactly.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-24, 76-79 | C6 / D10 | `SIGN_IN_SENDING='Sending code'`, `SIGN_IN_SIGNING_IN='Signing in…'`, `SIGN_IN_BROWSER='In browser'` are exported, but the controller writes the literals itself (`connection-ui.tsx:747 'Signing in…'`, `2138/2152/2950 'In browser'`); the panel then infers state by comparing `message === SIGN_IN_SENDING`. `SIGN_IN_SENDING`/`SIGN_IN_SIGNING_IN` have 0 importers. | Pass an explicit `phase: 'sending'\|'signing-in'\|'browser'\|null` prop from the controller instead of matching message text; delete the three constants (or have the controller import them if text matching stays). | Low–medium: copy must stay identical; `cloud-sign-in-state.test.mjs` imports `SIGN_IN_BROWSER`. |
| 2 | 12-16 | A7 | `CloudSignInActions` exported, 0 importers outside this file. `AlphaAuthBrand` exported, 0 importers (used only on line 93). | Un-export both. | None. |
| 3 | 25 | C1 | Local `type Pending = 'email'\|'phone'\|'resend'\|null` (name reused in `cloud-delegation-ui.tsx:35` and C1 list). | Rename `PendingSend`. | None. |
| 4 | 103, 104, 115 | D8 / D9 | 300–555-char JSX lines: inline `onSubmit` with phone/email detection regex, input props chain of ternaries (`type={showPhone ? 'tel' : emailEnabled && phone ? 'text' : 'email'}` repeated for `name`, `autoComplete`, `inputMode`, `aria-label`, label text). | Compute one `field = showPhone ? {...tel} : both ? {...text} : {...email}` record; extract `submitAddress(event)`. | Low. |
| 5 | 107, 111-112 | D12 | Inline `style={iconStyle('rotate-cw')}` icons beside CSS-class icons (`alpha-google-icon`). | Fine as is (shared `iconStyle`); note for D12 consolidation only. | — |
| 6 | 56-74 | — | Four effects; logic is reasonable. | KEEP. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CloudSignInActions` | interface | 12-16 | — | keep, un-export |
| `AlphaAuthBrand` | component | 17-19 | — | keep, un-export |
| `SIGN_IN_*` | const | 21-24 | literals in `connection-ui.tsx:747,2138,2152,2950` | replace with a `phase` prop |
| `Pending` | type | 25 | `cloud-delegation-ui.tsx:35` | rename locally |

## Proposed end state
~125 lines: message-text state inference replaced by a `phase` prop, unused exports dropped, the email/phone field descriptor extracted, formatter applied. All copy and aria semantics unchanged.

## Verification
`test/cloud-sign-in-state.test.mjs`, `test/cloud-phone-login.test.mjs`, `test/chooser-direct-entry.test.mjs`, `specs/quint/legacy/sign-in/check-sign-in-refinement.mjs`, Playwright `accessibility-sign-in.production.spec.ts`, `signed-out-page.production.spec.ts`, `native-cloud-signin.spec.ts`, `resident-first-run.production.spec.ts`.
