# test/assetlinks-cloud-config.test.mjs
- Lines: 180 | Kind: tooling (imports `scripts/render-assetlinks.ts`, runs its CLI in a temp copy, and runs the pinned upstream Cloud parser read via `git show`) | Verdict: KEEP, MERGE with `test/auth-callback-manifest.test.mjs` into `test/release/assetlinks.test.mjs`
- Covers: the operator value for `ELIZA_ANDROID_ASSET_LINKS_JSON` adds Alpha's release signer without disturbing other apps, refuses debug/unset signers and values Cloud would publish as `[]`, the published-document check, the HTTPS/no-redirect fetch rules, the CLI usage contract, and agreement with Cloud's own parser at the pinned upstream commit. Duplicates: none found. Callers/importers: `npm test`. `render-assetlinks.ts` is used by `scripts/verify-apks.ts:191` and `scripts/cloud-readiness.ts`, so it gates release.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 142-180 | — | The best test in the file: it checks Alpha's validator against `parseAndroidAssetLinksConfig` from `vendor/eliza` at `upstream.lock.json`'s commit, read with `git show` (the checkout is not touched), and it skips when that object is missing. | Keep. | — |
| 2 | 89-140 | T9 | The CLI test copies three files into a temp dir and spawns `node scripts/render-assetlinks.ts` 14 times. That is worthwhile for the exit-code contract (0/1/2), but the five usage-error spawns could be one table. | Keep; fold the usage-error loop into one assertion block. | Low |
| 3 | 27-87 | — | Function-level cases of a release tool. The owner forbids unit tests, but this is tooling that gates a release (T5 exemption). | Keep. | — |
| 4 | 18 | C3 | Reads `app.config.json` by hand; other release tests do the same. | Use the shared `readJson` helper from `scripts/lib` when it exists. | Low |

## Proposed end state
One `test/release/assetlinks.test.mjs` holds these six tests and the callback-filter table from `auth-callback-manifest.test.mjs`. Runtime stays a few seconds: one temp dir, about 14 child `node` processes, and one `git show`.
