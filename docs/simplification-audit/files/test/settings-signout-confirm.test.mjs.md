# test/settings-signout-confirm.test.mjs
- Lines: 23 | Kind: transplant (regex-extracts two `onClick` arrow bodies from `connection-ui.tsx` JSX and evals them in `vm`) | Verdict: DELETE (carry 1 case to `journeys/connection-cloud.spec.ts`)
- Covers: Account sheet Sign out: cancel keeps the account; confirm signs out once; a changed account during confirmation is not signed out. Duplicates: `test/browser/cloud-account-panel.spec.ts` renders the Sign out button but does not confirm/cancel. Callers/importers: `npm test` glob only; `ALPHA_CONNECTION_SOURCE` env knob nothing sets.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T9 | `ALPHA_CONNECTION_SOURCE` override knob; no caller sets it. | Delete. | Low |
| 2 | 8-9 | T2 | Regexes whole single-line JSX callbacks (`const expected=signOutAccount;...`); any formatter pass breaks it. | Delete. | Low |
| 3 | 17-23 | T2 | Changed-account race is the only non-trivial case; hard to reproduce in a journey and low-risk (worst case: no sign-out). | Drop. | Low |

## Proposed end state
File deleted. `journeys/connection-cloud.spec.ts`: open Settings > Account, press Sign out, Cancel keeps the account; press again,
confirm, and the panel shows Sign in with exactly one sign-out request recorded by the Cloud fake.
