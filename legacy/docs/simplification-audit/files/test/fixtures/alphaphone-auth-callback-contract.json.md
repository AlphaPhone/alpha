# test/fixtures/alphaphone-auth-callback-contract.json
- Lines: 271 | Kind: fixture (contract vectors for the in-app Cloud sign-in callback: success, error, return and reject URLs, fallback hand-offs, error allowlist, required authorize parameters) | Verdict: DELETE (orphan, A7), or wire it into a test of Alpha's real parser (owner question)
- Covers: nothing today. No file in the repo reads it.
- Duplicates: `vendor/eliza/packages/auth/android/test/fixtures/app-auth-callback-contract.json` has the same cases with `/example/auth/callback` and no `authorizeRequired`.
- Callers/importers: none. Its `$comment` says "each repo's contract test reads it", which is false here. `test/fixtures/google-browser-auth/native-sign-in.test.mjs:87` reads `test/fixtures/app-auth-callback-contract.json` relative to the overlaid upstream auth module (`test/google-browser-auth.test.mjs:17-21`), which is upstream's copy. A whole-repo grep for `auth-callback-contract` outside `vendor` and `docs` finds only this file and that overlay test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | Orphan fixture. The shared suite runs upstream's generic vectors, not these. | Delete. | Low |
| 2 | 2 | A8 | The `$comment` gives a false cross-repo maintenance instruction. | Goes with the file. | None |
| 3 | 37-43 | coverage | Nothing tests Alpha's specific callback path (`/alphaphone/auth/callback`), host pair or package against `AlphaCloudSignInPlugin.java`'s parser, apart from `scripts/verify-apks.ts`'s APK-level checks. | If the owner wants it: feed these vectors to the parser through the existing overlay run (point the overlay at this file, or parameterise the upstream test's path), then keep it. Otherwise accept the gap. | Medium |

## Proposed end state
Deleted. Or, if the owner says so, renamed to the name the overlay reads and consumed by `native-sign-in.test.mjs` against Alpha's packaged sign-in plugin, with the `$comment` reduced to a description.
