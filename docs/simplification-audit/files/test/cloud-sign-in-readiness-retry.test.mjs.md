# test/cloud-sign-in-readiness-retry.test.mjs
- Lines: 36 | Kind: source transplant (slices `inAppSignInMethods`, `beginSignIn`, `work` from `connection-ui.tsx` into a fake scope) plus `ui.includes(...)` source-text checks | Verdict: DELETE
- Covers: an interactive sign-in and explicit Retry ask native readiness with `refreshNegative:true` while automatic startup may use the cache; required-entry "Try again" and phone reconnect re-check readiness; automatic readiness neither clears a newer error nor restarts the agent. Duplicates: `test/cloud-sign-in-late-readiness.test.mjs` (same slices), `test/browser/saved-signin-retry.production.spec.ts` (Retry on the required sign-in entry). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | T2 / D8 | Entire first case is one ~2,000-character line: slicing, scope, compile and eight assertions. | Delete. | Low |
| 2 | 7 | T1 | `ui.includes('retry:()=>void connectionController.beginSignIn(...)')` and the reconnect call-site string. | Delete. | None |
| 3 | 10-36 | T2 | `work`/`beginSignIn` slice with fake `ensureResident`. | Delete. | Low |

## Proposed end state
Deleted. Keep the visible behaviour in `journeys/connection-cloud.spec.ts`: on the required sign-in page, "Try again" issues a fresh native `status` with `refreshNegative:true` (assert on the native fake's call log) and the earlier error stays until the answer arrives. `saved-signin-retry.production.spec.ts` folds into that journey.
