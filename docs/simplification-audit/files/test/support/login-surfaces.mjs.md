# test/support/login-surfaces.mjs
- Lines: 216 | Kind: inventory (prose + source regex patterns) | Verdict: DELETE
- Covers: a hand-written list of every credential-like input (website login, app login, Cloud sign-in, codes, API keys, pairing codes, prototype Wi-Fi and mail password fields) with a file path and regex per surface that `test/login-surfaces.test.mjs` matches against source. Duplicates: none in code; the policy prose overlaps `docs/prd.md` security rules. Callers/importers: only `test/login-surfaces.test.mjs` (reviewed as DELETE, T1+T5).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-215 | T1 | Each surface pins a regex over product source (`connection-ui.tsx`, `model.js`, `template.html`, `cloud-membership-ui.tsx`) and over `vendor/eliza` Java with exact `count`. Every reformat (D9 Prettier) breaks it. | Delete with its test. | none |
| 2 | 158-166 | A3/D5 | `pairing-code` surface describes hosted/remote pairing inputs (`remoteCode`, `localCode`) that D5 deletes. | Goes with the file. | none |
| 3 | 175-182 | A5 | `mail-account-sign-in-prototype` documents an unreachable prototype password form (`model.js` `st.addPw`). Record it as an A5 delete candidate for the prototype owner. | Product cleanup elsewhere. | low |
| 4 | 4-13 | A8 | `reviewed` is a changelog paragraph; `rules` is real security policy (website/app binding, secrets never cross the agent bridge, renderer WebView excluded from Autofill). | Owner decision: keep `rules` as prose in `docs/` if wanted; the test file is not the place. | low |
| 5 | 39-51, 69-72, 131-139 | B5 | `remainingGates` are device-acceptance to-do lists stored in test support. | Move to the device acceptance checklist if still wanted. | none |

## Proposed end state
Delete the file with `test/login-surfaces.test.mjs`. The enforceable rules move to build-output audits where they are
observable: renderer WebView `importantForAutofill` in `verify-apks`, no `type="password"` in the production bundle except
the reviewed key fields in `audit-production-bundle.ts`. The prose policy, if the owner wants it kept, becomes a short
section in `docs/` (owner question).
