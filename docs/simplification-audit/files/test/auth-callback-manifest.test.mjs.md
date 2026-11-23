# test/auth-callback-manifest.test.mjs
- Lines: 50 | Kind: tooling (`requiredAppLinkProblems`/`appLinkFilters` from `scripts/render-assetlinks.ts` over synthetic `aapt dump xmltree` text) | Verdict: MERGE into `test/release/assetlinks.test.mjs` (with `assetlinks-cloud-config.test.mjs`)
- Covers: the APK verifier requires exactly one exported HTTPS `autoVerify` VIEW/BROWSABLE filter on `MainActivity` for the sign-in callback host and path, and rejects near misses (host, path, prefix/pattern, http, autoVerify, action, category, a split or broadened filter, a hidden activity). Duplicates: none; `verify-apks.ts:191` is the production caller. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D13 | Deep import into the vendor checkout: `../vendor/eliza/packages/app/scripts/lib/android-manifest-facts.mjs` (`parseXmlTree`). It breaks whenever upstream moves the file. | Import through the same path `scripts/verify-apks.ts` uses for `parseXmlTree` (one alias), so the test and the verifier share one parser import. | Low |
| 2 | 34-41 | — | The table of nine rejections is the valuable part; a release-signing regression here breaks sign-in on real phones. | Carry all nine cases plus the "unrelated filters" and "broadened" cases. | — |
| 3 | 6-20 | D8 | Dense one-line builders. | Reformat when moved. | — |

## Proposed end state
Its three tests become one `describe('sign-in callback app link')` block in `test/release/assetlinks.test.mjs`, keeping the rejection table unchanged.
