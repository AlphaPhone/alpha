# test/release-signing.test.mjs
- Lines: 209 | Kind: tooling (real release scripts) + source-text (T1) | Verdict: MERGE into `test/tooling/release-signing.test.ts`; DELETE the T1 parts
- Covers: Partial signing env refused by name, signer descriptor validation, release admission (signer match, versionCode advance, test-mocks), `releaseDistributable`, assetlinks rendering and audit, App Link filter parsing. Duplicates: `test/record-release.test.mjs`, `test/publish-update-manifest.test.mjs` share descriptors. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-34 | T1 | Reads `android/consumer-host.json` and regexes upstream `consumer-host/app.gradle` text. | Delete (upstream owns its Gradle). | Low |
| 2 | 111-122 | T1 | Regexes `scripts/verify-apks.ts` source (single `.distributable =` assignment, exact `releaseReady` expression). | Delete; test `verify-apks` behaviour on a synthetic APK manifest if it is not already tested. | Medium |
| 3 | 176-191, 208 | T1 | Regexes `AndroidManifest.xml` and `product.gradle`. | Delete; `verify-apks` records `appLinks` from the packaged manifest (build-output audit). | Low |
| 4 | 17-25, 37-109, 124-174, 193-207 | keep | Real policy functions and the CLI on an isolated tree. | Carry. | Low |

## Proposed end state
- About 140 lines of behaviour tests in the release tooling file; no source regexes.
