# test/cloud-readiness.test.mjs
- Lines: 203 | Kind: tooling (real `scripts/cloud-readiness.ts` operator CLI with injected fetch; one part source-text) | Verdict: KEEP (move to `test/tooling/cloud-readiness.test.mjs`), drop the source-text assertions
- Covers: registration values printed for the Cloud operator come from `app.config.json` and the deployment policy; the credential-free probe checks every H-11…H-15 gate with one request each, follows no redirect, sends no credential or email address; each observed gap fails its own gate; staging App Links rules; CLI exit codes and argument refusal. Duplicates: none (only test of the README runbook tool). Callers/importers: `npm test` glob; imports `scripts/cloud-readiness.ts`, `cloud-deployment-policy.ts`, `render-assetlinks.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 27, 38-43 | T1 | Concatenates every Java file in the package and checks string literals; reads `AndroidManifest.xml` and matches an exact `<data .../>` line. | Delete those five assertions; the App Link filter and client ID are release rules for `scripts/verify-apks` (merged-manifest check on the built APK). | Low |
| 2 | 46-53 | B5 | Exact `deepEqual` of the whole operator value table and step list; any added row edits the test. | Keep the "no invented UUID / Google client ID" check (55-57) and the callback/tenant equalities; drop exact step-list and full-object equality. | Low |
| 3 | 94-125 | - | The core probe case (8 requests, manual redirects, https only, no credential, empty email body, PKCE shape). | Keep. | None |
| 4 | 127-180 | - | Gap and staging cases. | Keep; the "October 24 observations" comment is history (A8), reword. | None |
| 5 | 182-203 | - | CLI test depends on committed `android/release-signer.json` state (`signerSha256 === "unset"` branch, 195). | Keep; make it always use `fixtureRoot` so the result does not depend on the committed signer. | Low |
| 6 | 16-26 | C3 | Own temp-dir fixture helper. | Use the shared tooling temp helper if one is introduced. | None |

## Proposed end state
`test/tooling/cloud-readiness.test.mjs` with four cases (registration values, all gates pass, each gap fails, staging App Links) plus the CLI case, about 150 lines, no Java/manifest text reads.
