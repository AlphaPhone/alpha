# test/google-native-mfa.test.mjs
- Lines: 81 | Kind: transplant (slices `signInWithGoogle` out of `cloud-protocol.ts`, `signInGoogle`/`signInReturned` out of `connection-ui.tsx`, evals them with `new Function` and stubs) + source-text over vendor Java (`vendor/eliza/packages/auth/android/.../CloudSignInPlugin.java`) + one unit case (`googleOutcome`) | Verdict: DELETE
- Covers: Google sign-in that ends in an MFA challenge shows the MFA panel bound to the native attempt and environment, never binds an account or reads a stored credential before verification. Duplicates: `cloud-sign-in-flow.test.mjs`, `cloud-sign-in-state.test.mjs` (same `cloud-sign-in.ts` outcome parsing); upstream `CloudSignInPlugin` has its own suite. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-27, 38-40, 66-68 | T2 | Cuts methods between literal markers (`'  /** Sends a six-digit code'`, `'  /**\n   * A return reached Alpha'`) and runs them with 9-11 positional stubs. Breaks on any comment edit or the planned `connection-ui.tsx` split (D1). | Delete. | Low |
| 2 | 50-64, 79-81 | T1 / T5 | Regexes over upstream Java in `vendor/eliza`: tests upstream code and its text. | Delete; any rule worth keeping is an upstream test (D14 follow-up). | Low |
| 3 | 13-19 | T3 | `googleOutcome` validator table: unit of a parser that `cloud-sign-in-flow.test.mjs` also exercises. | Delete. | Low |

## Proposed end state
File deleted. One case in `journeys/connection-cloud.spec.ts`: the native Cloud sign-in fake answers Google sign-in
with `{status:'mfa'}`; the MFA panel appears, no account is shown as signed in, entering the code completes sign-in.
A second case: an MFA return delivered while another sign-in is busy is queued, not shown. Uses the existing native
Cloud sign-in fixture (`test/browser/*cloud*` helpers).
